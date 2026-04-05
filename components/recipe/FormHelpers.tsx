import { View, Text, TextInput } from 'react-native';

export function SectionLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className="text-latte-300 font-semibold text-sm">
      {label}
      {required && <Text className="text-harvest-500"> *</Text>}
    </Text>
  );
}

export function FieldError({ errors }: { errors: (string | undefined)[] }) {
  return (
    <Text className="text-xs px-1" style={{ color: '#f87171', opacity: errors.length > 0 ? 1 : 0 }}>
      {errors[0] ?? ' '}
    </Text>
  );
}

export function NumericField({
  value,
  onChange,
  label,
  placeholder,
  errors,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  errors?: (string | undefined)[];
}) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-latte-400 text-xs px-1">{label}</Text>
      <TextInput
        className="bg-ristretto-800 border border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-100 text-base"
        style={{ lineHeight: undefined }}
        placeholder={placeholder}
        placeholderTextColor="#6e5a47"
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChange}
      />
      {errors && <FieldError errors={errors} />}
    </View>
  );
}

export function validateNum(value: string) {
  if (!value) return undefined;
  return isNaN(parseFloat(value)) ? 'Must be a valid number' : undefined;
}

export function validateDate(value: string) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Use YYYY-MM-DD format';
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return 'Invalid date';
  }
  return undefined;
}
