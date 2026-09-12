import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import SignatureScreen, { SignatureViewRef } from "react-native-signature-canvas";
import { useThemeColors, fonts, spacing, radius } from "../theme/tokens";

export type SignaturePadHandle = {
  /** Citește desenul curent — rezolvă cu un PNG base64 (data URL), sau `null` dacă nu
   * s-a desenat nimic (SAU dacă WebView-ul intern încă nu s-a încărcat — semnătura fiind
   * opțională, nu are rost să blocăm exportul din cauza unei librării externe). Bazat pe
   * `onOK`/`onEmpty` din react-native-signature-canvas, care sunt callback-uri (nu o
   * promisiune), de-aia le înfășurăm într-una singură — cu un timeout de siguranță,
   * pentru cazul (observat în practică — "WebView ref is null when calling
   * readSignature") în care WebView-ul nu e încă gata și librăria nu apelează niciun
   * callback, ceea ce altfel ar lăsa promisiunea agățată la infinit. */
  capture: () => Promise<string | null>;
  clear: () => void;
};

const CAPTURE_TIMEOUT_MS = 1500;

/** Zonă de desenat semnătura, cu degetul/mouse-ul — folosește react-native-signature-canvas
 * (un WebView cu un `<canvas>` HTML5 înăuntru), ca să funcționeze la fel pe web și pe
 * nativ fără cod separat per platformă. `webStyle` ascunde bara proprie de butoane a
 * bibliotecii (Clear/Confirm) — controlul e din React Native, prin `ref`, ca restul
 * ecranului (buton "Șterge" + butonul de submit al formularului) să arate consecvent cu
 * restul aplicației. */
export const SignaturePad = forwardRef<SignaturePadHandle, { height?: number }>(function SignaturePad(
  { height = 220 },
  ref
) {
  const colors = useThemeColors();
  const canvasRef = useRef<SignatureViewRef>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    capture: () =>
      new Promise((resolve) => {
        let settled = false;
        const finish = (value: string | null) => {
          if (settled) return;
          settled = true;
          resolverRef.current = null;
          resolve(value);
        };
        resolverRef.current = finish;

        if (!canvasRef.current) {
          finish(null);
          return;
        }
        try {
          canvasRef.current.readSignature();
        } catch {
          finish(null);
          return;
        }
        // Plasă de siguranță — dacă librăria nu apelează nici onOK, nici onEmpty
        // (WebView-ul intern nu s-a încărcat încă), nu lăsăm promisiunea agățată.
        setTimeout(() => finish(null), CAPTURE_TIMEOUT_MS);
      }),
    clear: () => {
      canvasRef.current?.clearSignature();
      setHasSignature(false);
    },
  }));

  return (
    <View>
      <View style={[styles.canvasBox, { borderColor: colors.line, height }]}>
        <SignatureScreen
          ref={canvasRef}
          onOK={(signature) => {
            resolverRef.current?.(signature);
            resolverRef.current = null;
          }}
          onEmpty={() => {
            resolverRef.current?.(null);
            resolverRef.current = null;
          }}
          onBegin={() => setHasSignature(true)}
          trimWhitespace
          webStyle={SIGNATURE_WEB_STYLE}
          descriptionText=""
        />
      </View>
      <View style={styles.footer}>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint }}>
          {hasSignature ? "Semnătură adăugată." : "Desenează semnătura beneficiarului mai sus (opțional)."}
        </Text>
        <Pressable
          onPress={() => {
            canvasRef.current?.clearSignature();
            setHasSignature(false);
          }}
        >
          <Text style={{ color: colors.accentInk, fontFamily: fonts.bodyMedium, fontSize: 13 }}>Șterge</Text>
        </Pressable>
      </View>
    </View>
  );
});

/** Ascunde bara de jos (Clear/Confirm) a bibliotecii și scoate umbra/marginea implicită
 * a canvasului — controalele proprii sunt deja în componenta de mai sus. */
const SIGNATURE_WEB_STYLE = `
  .m-signature-pad--footer { display: none; margin: 0; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad { box-shadow: none; border: none; height: 100%; }
  body, html { background-color: #FFFFFF; height: 100%; }
`;

const styles = StyleSheet.create({
  canvasBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
});
