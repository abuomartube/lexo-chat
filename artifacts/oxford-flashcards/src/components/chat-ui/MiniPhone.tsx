import type { ReactNode } from "react";
import { PhoneFrame } from "./PhoneFrame";

const SCALE = 0.5;
const NATIVE_W = 390 + 14;
const NATIVE_H = 844 + 14;
export const MINI_W = Math.round(NATIVE_W * SCALE);
export const MINI_H = Math.round(NATIVE_H * SCALE);

export function MiniPhone({
  children,
  dir = "rtl",
}: {
  children: ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div
      style={{ width: MINI_W, height: MINI_H }}
      className="relative shrink-0"
    >
      <div
        style={{
          width: NATIVE_W,
          height: NATIVE_H,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
        }}
        className="absolute top-0 left-0"
      >
        <PhoneFrame dir={dir}>{children}</PhoneFrame>
      </div>
    </div>
  );
}
