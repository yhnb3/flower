import React from "react";
import "./PageState.css";

export default function PageState({ icon: Icon, title, description, action }) {
  return (
    <main className="app-shell page-state-shell">
      <section className="page-state-card">
        <Icon aria-hidden="true" size={32} />
        <h1>{title}</h1>
        <p>{description}</p>
        {action}
      </section>
    </main>
  );
}
