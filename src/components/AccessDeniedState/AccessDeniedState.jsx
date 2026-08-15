import React from "react";
import { SignOutButton } from "@clerk/react";
import { LogOut, ShieldX } from "lucide-react";
import PageState from "../PageState/PageState.jsx";
import "./AccessDeniedState.css";

export default function AccessDeniedState() {
  return (
    <PageState
      icon={ShieldX}
      title="접근할 수 없는 계정이에요"
      description="허용된 Google 계정으로 다시 로그인해 주세요."
      action={
        <SignOutButton>
          <button className="access-denied-button" type="button">
            <LogOut aria-hidden="true" size={18} />
            다른 계정으로 로그인
          </button>
        </SignOutButton>
      }
    />
  );
}
