import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyBz142pojAcCqziMANprNHS0BnDnyYYEaw",
  authDomain: "mkmods-61cd1.firebaseapp.com",
  databaseURL: "https://mkmods-61cd1-default-rtdb.firebaseio.com",
  projectId: "mkmods-61cd1",
  storageBucket: "mkmods-61cd1.appspot.com",
  messagingSenderId: "751690799830",
  appId: "1:751690799830:web:6ecf771f395e6203e78777",
  measurementId: "G-SSZ2GNKCN3",
}

const app = initializeApp(firebaseConfig)
export const database = getDatabase(app)
export const storage = getStorage(app)
