import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-ristretto-900 items-center justify-center px-8">
          <Text className="text-latte-100 text-lg font-semibold mb-2">Something went wrong</Text>
          <Text className="text-latte-500 text-sm text-center mb-6">
            {this.state.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false, message: '' })}>
            <Text className="text-harvest-400 font-semibold">Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
