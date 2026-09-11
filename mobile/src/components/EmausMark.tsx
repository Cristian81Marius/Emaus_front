import React from "react";
import { Image, useColorScheme } from "react-native";

const MARK_GREEN = require("../../assets/emaus-mark-green.png");
const MARK_MINT = require("../../assets/emaus-mark-mint.png");

/** Marca Emaus (acoperiș + coș, redesenată după logo-ul asociației) — fișierele sursă
 * sunt generate din `docs`/cerința inițială și trăiesc în `assets/emaus-mark-*.png`.
 * O variantă verde de brand pentru light mode, una mentă (mai deschisă) pentru dark
 * mode, ca marca să rămână lizibilă pe orice fundal. Folosită în anteturile ecranelor
 * principale — vezi login.tsx și app/index.tsx. */
export function EmausMark({ size = 28 }: { size?: number }) {
  const scheme = useColorScheme();
  const source = scheme === "dark" ? MARK_MINT : MARK_GREEN;
  return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />;
}
