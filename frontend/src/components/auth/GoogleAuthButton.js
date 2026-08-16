import React from "react";
import { GoogleLogin } from "@react-oauth/google";

const GoogleAuthButton = ({ onSuccess, onError, loading, label }) => {
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (onSuccess && credentialResponse.credential) {
            onSuccess(credentialResponse.credential);
          }
        }}
        onError={() => {
          if (onError) {
            onError("Google sign-in failed");
          }
        }}
        theme="filled_black"
        size="large"
        text={label === "signup_with" ? "signup_with" : "signin_with"}
        shape="rectangular"
        width="300"
        disabled={loading}
        logo_alignment="center"
      />
    </div>
  );
};

export default GoogleAuthButton;
