import { forwardRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { textInputStyle } from '@/lib/styles';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  inputClassName?: string;
};

export const PasswordInput = forwardRef<TextInput, Props>(function PasswordInput(
  { inputClassName, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="relative">
      <TextInput
        ref={ref}
        {...props}
        secureTextEntry={!visible}
        style={textInputStyle}
        className={
          inputClassName ??
          'bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl pl-4 pr-12 py-3.5 text-latte-950 dark:text-latte-100 text-base'
        }
      />
      <TouchableOpacity
        onPress={() => setVisible((v) => !v)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-0 bottom-0 justify-center"
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color="#9c7a5e"
        />
      </TouchableOpacity>
    </View>
  );
});
