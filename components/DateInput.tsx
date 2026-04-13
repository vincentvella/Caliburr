import { textInputStyle } from '@/lib/styles';
import { View, Text, TextInput, TouchableOpacity, Modal, Platform } from 'react-native';
import { useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  value: string;
  onChange: (v: string) => void;
  label: string;
}

// Parse YYYY-MM-DD into a local-time Date to avoid UTC-offset day shifts
function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DateInput({ value, onChange, label }: Props) {
  const [show, setShow] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(new Date());
  const today = new Date();

  function openPicker() {
    setPendingDate(value ? toDate(value) : today);
    setShow(true);
  }

  // ── Web: masked text input ──────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    function handleChange(text: string) {
      const digits = text.replace(/\D/g, '').slice(0, 8);
      let formatted = digits;
      if (digits.length > 6) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
      } else if (digits.length > 4) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
      }
      onChange(formatted);
    }

    return (
      <View className="gap-1">
        <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">{label}</Text>
        <TextInput
          className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5 text-latte-950 dark:text-latte-100 text-base"
          style={textInputStyle}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#6e5a47"
          keyboardType="number-pad"
          maxLength={10}
          value={value}
          onChangeText={handleChange}
        />
      </View>
    );
  }

  // ── Android: modal dialog auto-closes on selection ──────────────────────────
  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setShow(false);
    if (event.type === 'set' && selected) onChange(fromDate(selected));
  }

  // ── iOS: spinner in a bottom sheet ─────────────────────────────────────────
  function handleIOSChange(_: DateTimePickerEvent, selected?: Date) {
    if (selected) setPendingDate(selected);
  }

  return (
    <View className="gap-1">
      <Text className="text-latte-700 dark:text-latte-400 text-xs px-1">{label}</Text>
      <TouchableOpacity
        onPress={openPicker}
        className="bg-oat-100 dark:bg-ristretto-800 border border-latte-200 dark:border-ristretto-700 rounded-xl px-4 py-3.5"
      >
        <Text style={{ color: value ? '#e8d5c0' : '#6e5a47', fontSize: 16 }}>
          {value || 'Select date'}
        </Text>
      </TouchableOpacity>

      {/* Android: render picker directly (shown only when open) */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          mode="date"
          value={pendingDate}
          maximumDate={today}
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS: spinner in a bottom-sheet modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="bg-oat-100 dark:bg-ristretto-800 rounded-t-3xl pb-10">
              <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                <TouchableOpacity
                  onPress={() => {
                    onChange('');
                    setShow(false);
                  }}
                >
                  <Text className="text-latte-600 dark:text-latte-500 font-semibold">Clear</Text>
                </TouchableOpacity>
                <Text className="text-latte-800 dark:text-latte-200 font-semibold">{label}</Text>
                <TouchableOpacity
                  onPress={() => {
                    onChange(fromDate(pendingDate));
                    setShow(false);
                  }}
                >
                  <Text className="text-harvest-400 font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                mode="date"
                display="spinner"
                value={pendingDate}
                maximumDate={today}
                onChange={handleIOSChange}
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
