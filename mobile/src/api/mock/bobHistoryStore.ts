// Singurul loc din tot mock-ul (Emaus sau BOB) care persistă cu-adevărat între
// reporniri ale serverului de dev — la cererea explicită a utilizatorului ("să se
// salveze în DB"). Restul mock-ului (`data.ts`, `bobData.ts`) rămâne intenționat doar
// în memorie (vezi mobile/CLAUDE.md — "Stare curentă: aplicația rulează pe date
// mock"), dar un istoric de cumpărături care dispare la fiecare `npm run web` n-ar
// avea nicio valoare reală, deci ăsta e persistat cu AsyncStorage (funcționează și pe
// web, peste IndexedDB/localStorage, și pe nativ).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BobDeliveryRecordDto } from "../bobTypes";

const STORAGE_KEY = "bob.purchaseHistory";

export async function loadPurchaseHistory(): Promise<BobDeliveryRecordDto[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BobDeliveryRecordDto[]) : [];
  } catch {
    return [];
  }
}

export async function savePurchaseHistory(list: BobDeliveryRecordDto[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // dacă scrierea eșuează (spațiu, permisiuni), înregistrarea rămâne totuși
    // vizibilă pentru sesiunea curentă (ținută în răspunsul funcției apelante) —
    // doar nu supraviețuiește unui restart.
  }
}
