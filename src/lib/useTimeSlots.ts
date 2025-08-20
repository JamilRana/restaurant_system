// lib/useTimeSlots.ts
import { useRestaurantStore } from "@/app/store/restaurantStore";
import { useMemo } from "react";

export function useTimeSlots() {
  const restInfo = useRestaurantStore();
  const collectionTime =
    restInfo.restaurant?.collectionTime?.trim() || "18:00-22:00";

  return useMemo(() => {
    const [startStr, endStr] = collectionTime.split("-").map((s) => s.trim());
    if (!startStr || !endStr) return [];

    const parseHour = (time: string) => {
      const match = time.match(/^(\d{1,2}):(\d{2})$/);
      return match ? parseInt(match[1], 10) : null;
    };

    const startHour = parseHour(startStr) ?? 18;
    const endHour = parseHour(endStr) ?? 22;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let hour = currentMinute <= 30 ? currentHour : currentHour + 1;
    let minute = currentMinute <= 30 ? 30 : 0;
    hour = Math.max(hour, startHour);

    const slots = [];
    while (hour < endHour || (hour === endHour && minute === 0)) {
      slots.push(
        `${hour.toString().padStart(2, "0")}:${minute === 0 ? "00" : "30"}`
      );
      minute = (minute + 30) % 60;
      if (minute === 0) hour++;
    }

    return slots;
  }, [collectionTime]);
}
