// lib/useTimeSlots.ts
import { useRestaurantStore } from "@/app/store/restaurantStore";
import { useMemo } from "react";

export function useTimeSlots(selectedDate?: string): string[] {
  const restInfo = useRestaurantStore();
  const collectionTime =
    restInfo.restaurant?.collectionTime?.trim() || "18:00-22:00";

  return useMemo(() => {
    // Parse opening hours
    const [startStr, endStr] = collectionTime.split("-").map((s) => s.trim());
    if (!startStr || !endStr) return [];

    const parseTime = (time: string) => {
      const match = time.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return { hour: h, minute: m };
    };

    const start = parseTime(startStr);
    const end = parseTime(endStr);

    if (!start || !end) return [];

    // Convert to total minutes for comparison
    const startTotalMin = start.hour * 60 + start.minute;
    const endTotalMin = end.hour * 60 + end.minute;

    if (startTotalMin >= endTotalMin) return []; // Invalid range

    const now = new Date();
    const selected = selectedDate ? new Date(selectedDate) : now;
    const isToday =
      selected &&
      selected.getFullYear() === now.getFullYear() &&
      selected.getMonth() === now.getMonth() &&
      selected.getDate() === now.getDate();

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMin = currentHour * 60 + currentMinute;

    const slots: string[] = [];
    let totalMin = startTotalMin;

    while (totalMin < endTotalMin) {
      const hour = Math.floor(totalMin / 60);
      const minute = totalMin % 60;

      // Skip past times only if it's today
      const slotTotalMin = hour * 60 + minute;
      if (!isToday || slotTotalMin >= currentTotalMin + 30) {
        slots.push(
          `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`
        );
      }

      totalMin += 30; // 30-min intervals
    }

    return slots;
  }, [collectionTime, selectedDate]);
}
