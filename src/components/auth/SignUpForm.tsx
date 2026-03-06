'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpForm() {
  return (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      forceRedirectUrl="/select-org"
      appearance={{
        variables: { colorPrimary: '#8c6d2c' },
      }}
    />
  );
}
