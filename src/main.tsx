import React from "react"
import ReactDOM from "react-dom/client"
import AppWrapper from "./AppWrapper"
import { trackPageview } from "./track"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
)

// Log one pageview on load (captures the landing + any UTM tags from emails).
trackPageview()
