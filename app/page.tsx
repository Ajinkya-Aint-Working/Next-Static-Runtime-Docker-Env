"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [apiUrl, setApiUrl] = useState("");

  useEffect(() => {
    const url = window?.env?.API_URL;
    console.log("Runtime API URL:", url);
    setApiUrl(url || "");
  }, []);

  return <h1>API URL: {apiUrl}</h1>;
}
