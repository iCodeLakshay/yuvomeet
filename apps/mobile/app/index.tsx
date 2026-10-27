import React from 'react';
import { Redirect } from 'expo-router';
import { useYuvomeet } from '../src/lib/store';

export default function IndexRedirect() {
  const { profile } = useYuvomeet();

  if (profile.status === 'suspended' || profile.status === 'banned') {
    return <Redirect href="/suspended" />;
  }

  return <Redirect href="/(tabs)/feed" />;
}
