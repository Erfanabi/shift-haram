/**
 * ماتریس لوح یک منطقه: ستون‌ها بازه‌های زمانی، ردیف‌ها پست‌ها — همان چیدمان
 * لوح سنتی. ستون نام پست ثابت می‌ماند و بقیه افقی اسکرول می‌شود.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { cellKey, type Post, type Shift, type TimeSlot, type Zone } from '../domain/types';
import type { EngineContext } from '../engine';
import type { EditorApi } from '../hooks/useScheduleEditor';
import { useCellRegistry } from '../hooks/useCellRegistry';
import { fa } from '../lib/format';
import { COLORS } from '../lib/theme';
import { EmptySeat, KhademCard } from './KhademCard';
import { Txt } from './ui';

const COL_W = 112;
const POST_COL_W = 140;
const HEADER_H = 46;
const SEAT_H = 42;
const REST_SEAT_H = 30;

interface Props {
  zone: Zone;
  posts: Post[];
  slots: TimeSlot[];
  shift: Shift;
  ctx: EngineContext;
  editor: EditorApi;
  onForbidden: (message: string) => void;
  onMoved: () => void;
}

export function ScheduleGrid({ zone, posts, slots, shift, ctx, editor, onForbidden, onMoved }: Props) {
  const registry = useCellRegistry();
  const gridRef = useRef<View>(null);
  const [dragging, setDragging] = useState<{ name: string } | undefined>();

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOpacity = useSharedValue(0);

  const occupantsOf = useCallback(
    (postId: string, slotId: string) =>
      shift.assignments.filter((a) => a.postId === postId && a.slotId === slotId),
    [shift.assignments],
  );

  const rowHeights = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      if (post.kind === 'rest') {
        const max = Math.max(
          1,
          ...slots.map((s) => occupantsOf(post.id, s.id).length),
        );
        map.set(post.id, max * REST_SEAT_H + 10);
      } else {
        map.set(post.id, post.capacity * SEAT_H + 10);
      }
    }
    return map;
  }, [occupantsOf, posts, slots]);

  const measureGrid = useCallback(() => {
    gridRef.current?.measureInWindow((x, y) => registry.setGridPage(x, y));
  }, [registry]);

  const handleDrop = useCallback(
    (pageX: number, pageY: number) => {
      // بازگرداندن کارت شناور در onFinalize همان ژست انجام می‌شود
      setDragging(undefined);
      const hit = registry.hitTest(pageX, pageY);
      if (!hit) {
        editor.clear();
        return;
      }
      const result = editor.drop(hit.postId, hit.slotId);
      if (result.ok) onMoved();
      else onForbidden(result.message ?? 'این جابه‌جایی مجاز نیست');
    },
    [editor, onForbidden, onMoved, registry],
  );

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghostOpacity.value,
    transform: [{ translateX: ghostX.value }, { translateY: ghostY.value }],
  }));

  const renderSeat = (post: Post, slot: TimeSlot, index: number) => {
    const occupants = occupantsOf(post.id, slot.id);
    const assignment = occupants[index];
    const key = cellKey(post.id, slot.id);
    const isLegal = editor.legal.has(key);

    if (!assignment) {
      return (
        <View key={`${key}-${index}`} style={{ height: post.kind === 'rest' ? REST_SEAT_H : SEAT_H, padding: 2 }}>
          <EmptySeat
            critical={post.isCritical}
            legal={isLegal}
            onPress={() => {
              const result = editor.tapCell(post.id, slot.id);
              if (!result) return;
              if (result.ok) onMoved();
              else onForbidden(result.message ?? 'این جابه‌جایی مجاز نیست');
            }}
          />
        </View>
      );
    }

    const khadem = ctx.khademById.get(assignment.khademId);
    const attendance = ctx.attendanceOf.get(assignment.khademId);
    const selected =
      editor.selection?.khademId === assignment.khademId && editor.selection.slotId === slot.id;
    // مسیر روزانه در سطح «خانه» ذخیره می‌شود؛ در پست‌های چندظرفیته فقط خودِ خادم باید روشن شود
    const onJourney =
      editor.journey.has(key) && !selected && assignment.khademId === editor.selection?.khademId;
    const dimmed = !!editor.selection && !selected && !onJourney && !isLegal;

    const pan = Gesture.Pan()
      .activateAfterLongPress(220)
      .enabled(!editor.isLocked)
      .onBegin(() => {
        ghostX.value = 0;
        ghostY.value = 0;
      })
      .onStart((event) => {
        ghostOpacity.value = 1;
        ghostX.value = event.absoluteX - 60;
        ghostY.value = event.absoluteY - 100;
        runOnJS(setDragging)({ name: khadem?.fullName ?? '' });
        runOnJS(editor.select)({
          khademId: assignment.khademId,
          slotId: slot.id,
          postId: post.id,
        });
      })
      .onUpdate((event) => {
        ghostX.value = event.absoluteX - 60;
        ghostY.value = event.absoluteY - 100;
      })
      .onEnd((event) => {
        runOnJS(handleDrop)(event.absoluteX, event.absoluteY);
      })
      .onFinalize(() => {
        ghostOpacity.value = withSpring(0);
      });

    return (
      <GestureDetector key={`${key}-${index}`} gesture={pan}>
        <View style={{ height: post.kind === 'rest' ? REST_SEAT_H : SEAT_H, padding: 2 }}>
          <KhademCard
            name={khadem?.fullName ?? '—'}
            tone={post.kind === 'rest' ? 'rest' : attendance?.status === 'late' ? 'late' : 'active'}
            veteran={khadem?.seniority === 'veteran'}
            compact={post.kind === 'rest'}
            selected={selected}
            onJourney={onJourney}
            dimmed={dimmed}
            disabled={editor.isLocked}
            onPress={() => {
              if (editor.selection && !selected) {
                const result = editor.tapCell(post.id, slot.id);
                if (result?.ok) onMoved();
                else if (result) onForbidden(result.message ?? 'این جابه‌جایی مجاز نیست');
                return;
              }
              editor.select({
                khademId: assignment.khademId,
                slotId: slot.id,
                postId: post.id,
              });
            }}
          />
        </View>
      </GestureDetector>
    );
  };

  return (
    <View className="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          registry.setScrollY(e.nativeEvent.contentOffset.y)
        }
      >
        <View className="flex-row">
        {/* ستون ثابت نام پست‌ها */}
        <View style={{ width: POST_COL_W }}>
          <View
            className="items-center justify-center border-b border-l"
            style={{ height: HEADER_H, backgroundColor: zone.color, borderColor: COLORS.line }}
          >
            <Txt weight="bold" className="text-[12px] text-white">
              {zone.name}
            </Txt>
          </View>
          {posts.map((post) => (
            <View
              key={post.id}
              className="justify-center border-b border-l px-2"
              style={{
                height: rowHeights.get(post.id),
                borderColor: COLORS.line,
                backgroundColor: post.kind === 'rest' ? COLORS.rest : '#fff',
              }}
            >
              <Txt weight="medium" className="text-[11.5px] text-ink" numberOfLines={2}>
                {post.name}
              </Txt>
              <View className="mt-1 flex-row items-center gap-1">
                {post.isCritical ? (
                  <Txt className="text-[9.5px]" style={{ color: COLORS.danger }}>
                    حیاتی
                  </Txt>
                ) : null}
                {post.kind === 'active' ? (
                  <Txt className="text-[9.5px]" style={{ color: COLORS.muted }}>
                    سختی {fa(post.hardship)}
                  </Txt>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* ناحیه‌ی اسکرول‌شونده‌ی بازه‌های زمانی */}
        <View
          ref={gridRef}
          className="flex-1"
          onLayout={measureGrid}
          collapsable={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
              registry.setScrollX(e.nativeEvent.contentOffset.x)
            }
          >
            <View>
              <View className="flex-row" style={{ height: HEADER_H }}>
                {slots.map((slot) => (
                  <View
                    key={slot.id}
                    className="items-center justify-center border-b border-l"
                    style={{ width: COL_W, borderColor: COLORS.line, backgroundColor: '#fffbe8' }}
                    onLayout={(e: LayoutChangeEvent) =>
                      registry.registerColumn(slot.id, e.nativeEvent.layout.x, e.nativeEvent.layout.width)
                    }
                  >
                    <Txt weight="bold" className="text-[13px] text-ink">
                      {slot.label}
                    </Txt>
                  </View>
                ))}
              </View>

              <View
                onLayout={(e: LayoutChangeEvent) => registry.setBodyOffsetY(e.nativeEvent.layout.y)}
              >
                {posts.map((post) => (
                  <View
                    key={post.id}
                    className="flex-row"
                    style={{ height: rowHeights.get(post.id) }}
                    onLayout={(e: LayoutChangeEvent) =>
                      registry.registerRow(post.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height)
                    }
                  >
                    {slots.map((slot) => {
                      const seats =
                        post.kind === 'rest'
                          ? Math.max(1, occupantsOf(post.id, slot.id).length)
                          : post.capacity;
                      const key = cellKey(post.id, slot.id);
                      const isLegal = editor.legal.has(key);
                      return (
                        <View
                          key={slot.id}
                          className="border-b border-l px-0.5 py-1"
                          style={{
                            width: COL_W,
                            borderColor: COLORS.line,
                            backgroundColor: isLegal
                              ? '#16a34a1f'
                              : post.kind === 'rest'
                                ? COLORS.rest
                                : '#fff',
                          }}
                        >
                          {Array.from({ length: seats }).map((_, i) => renderSeat(post, slot, i))}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
        </View>
      </ScrollView>

      {/* کارت شناور هنگام درگ */}
      <Animated.View
        pointerEvents="none"
        className="absolute left-0 top-0 rounded-lg px-3 py-2 shadow-lg"
        style={[{ backgroundColor: COLORS.ink, width: 120 }, ghostStyle]}
      >
        <Txt weight="bold" className="text-[12px] text-white text-center">
          {dragging?.name ?? ''}
        </Txt>
      </Animated.View>
    </View>
  );
}

export const GRID_METRICS = { COL_W, POST_COL_W, HEADER_H, SEAT_H, REST_SEAT_H };
