import { Linking } from "react-native";

/** Deschide o adresă în aplicația de hărți implicită a telefonului (Google Maps/Apple
 * Maps/orice altă aplicație înregistrată pentru linkuri `maps`) — linkul universal
 * Google Maps funcționează pe iOS/Android/web deopotrivă, fără nicio bibliotecă nouă. */
export function openInMaps(address: string) {
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() => {});
}
