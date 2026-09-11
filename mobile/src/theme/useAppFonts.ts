import {
  useFonts,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from "@expo-google-fonts/fraunces";
import {
  Karla_400Regular,
  Karla_500Medium,
  Karla_700Bold,
} from "@expo-google-fonts/karla";
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from "@expo-google-fonts/ibm-plex-mono";

/** Încarcă cele trei familii de fonturi ale identității vizuale. Ecranul rădăcină
 * (app/_layout.tsx) așteaptă `fontsLoaded` înainte de a afișa orice conținut, ca
 * să nu clipească textul din fontul de sistem înainte de fontul corect. */
export function useAppFonts() {
  return useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Karla_400Regular,
    Karla_500Medium,
    Karla_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
}
