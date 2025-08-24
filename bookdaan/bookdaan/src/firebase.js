import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCXLaBc7Gdoy0olrMV8pr8L990I9tM9Vnc",
  authDomain: "bookdaan.firebaseapp.com",
  projectId: "bookdaan",
  storageBucket: "bookdaan.appspot.com",
  messagingSenderId: "948945107768",
  appId: "1:948945107768:web:b0a5cb173828598c5e1fcd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, RecaptchaVerifier, signInWithPhoneNumber };
