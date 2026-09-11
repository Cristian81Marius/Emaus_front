// Un canal de evenimente foarte simplu — ca serverul mock să poată "împinge" o
// previzualizare de push notification către UI chiar în momentul în care o notificare
// e creată, nu doar la următoarea cerere de tip poll. Nu e legat de rețea (totul rulează
// în același proces JS), deci un pub/sub de modul e suficient — nu trebuie WebSocket.
import { NotificationType } from "../types";

export interface PushEvent {
  type: NotificationType;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  /** Numele destinatarilor — pentru previzualizare ("așa ar arăta la ei"), nu pentru
   * livrare reală (n-avem push real, vezi mobile/CLAUDE.md). */
  recipientNames: string[];
}

type Listener = (event: PushEvent) => void;

let listeners: Listener[] = [];

export function onPushEvent(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function emitPushEvent(event: PushEvent): void {
  listeners.forEach((listener) => listener(event));
}
