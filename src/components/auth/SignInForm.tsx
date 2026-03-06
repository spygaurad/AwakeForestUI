'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInForm() {
  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      forceRedirectUrl="/dashboard"
      appearance={{
        variables: { colorPrimary: '#8c6d2c' },
      }}
    />
  );
}
