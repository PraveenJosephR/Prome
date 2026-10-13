
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import {
  Quicksand_400Regular,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';

type Birthday = {
  id: string;
  name: string;
  date: string;
};

const C = {
  red: '#DF301C',
  orange: '#FF9100',
  cream: '#FFF1D1',
  cyan: '#00B7CD',
  green: '#299B62',
};

const F = {
  regular: 'Quicksand_400Regular',
  medium: 'Quicksand_600SemiBold',
  bold: 'Quicksand_700Bold',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad = (n: number) => String(n).padStart(2, '0');

const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const keyOf = (s: string) => {
  const d = fromISO(s);
  return (d.getMonth() + 1) * 100 + d.getDate();
};

const formatDate = (s: string) =>
  fromISO(s).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export default function Index() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return new Date(2000, today.getMonth(), today.getDate());
  });

  const openDrawer = useCallback(() => {
    const today = new Date();
    setName('');
    setDate(new Date(2000, today.getMonth(), today.getDate()));
    setDrawer(true);
  }, []);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dy < -12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -45) openDrawer();
        },
      }),
    [openDrawer],
  );

  const now = new Date();
  const today = (now.getMonth() + 1) * 100 + now.getDate();

  const upcoming = birthdays
    .filter((b) => keyOf(b.date) >= today)
    .sort((a, b) => keyOf(a.date) - keyOf(b.date));

  const completed = birthdays
    .filter((b) => keyOf(b.date) < today)
    .sort((a, b) => keyOf(b.date) - keyOf(a.date));

  const addBirthday = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name.');
      return;
    }

    setBirthdays((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        name: name.trim(),
        date: toISO(date),
      },
    ]);
    setDrawer(false);
    setName('');
  };

  const removeBirthday = (b: Birthday) => {
    Alert.alert('Remove birthday?', `Remove ${b.name}'s birthday?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, remove',
        style: 'destructive',
        onPress: () =>
          setBirthdays((prev) => prev.filter((item) => item.id !== b.id)),
      },
    ]);
  };

  const changeMonth = (offset: number) => {
    setDate((current) => new Date(2000, current.getMonth() + offset, 1));
  };

  const selectDay = (day: number) => {
    setDate((current) => new Date(2000, current.getMonth(), day));
  };

  if (!fontsLoaded) return <View style={styles.screen} />;

  const renderSection = (title: string, data: Birthday[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {data.length === 0 ? (
        <Text style={styles.empty}>
          {title === 'Upcoming'
            ? 'No upcoming birthdays'
            : 'No completed birthdays'}
        </Text>
      ) : (
        data.map((b) => {
          const isToday = keyOf(b.date) === today;

          return (
            <View
              key={b.id}
              style={[styles.item, isToday && styles.todayItem]}
            >
              <View style={styles.itemText}>
                <Text style={[styles.name, isToday && styles.todayText]}>
                  {b.name}
                </Text>
                <Text style={[styles.dateText, isToday && styles.todayText]}>
                  {formatDate(b.date)}
                  {isToday ? ' · TODAY!' : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => removeBirthday(b)}
                hitSlop={10}
                accessibilityLabel={`Remove ${b.name}`}
              >
                <Ionicons name="close" size={22} color={C.red} />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      <View style={styles.header}>
        <Text style={styles.title}>birthdays.</Text>
      </View>

      <FlatList
        data={[{ key: 'birthdays' }]}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.content}
        renderItem={() => (
          <>
            {renderSection('Upcoming', upcoming)}
            {renderSection('Completed', completed)}
          </>
        )}
      />

      <View style={styles.swipePrompt} {...swipeResponder.panHandlers}>
        <TouchableOpacity
          style={styles.swipePromptButton}
          activeOpacity={0.75}
          onPress={openDrawer}
          accessibilityRole="button"
          accessibilityLabel="Swipe up or tap to add a birthday"
        >
          <View style={styles.swipeHandle} />
          <Text style={styles.swipePromptText}>Swipe up to add a birthday</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={drawer}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawer(false)}
      >
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setDrawer(false)}
            accessibilityLabel="Close drawer"
          />

          <View
            style={[
              styles.drawer,
              { paddingBottom: Math.max(insets.bottom, 18) },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>New birthday</Text>
              <TouchableOpacity onPress={() => setDrawer(false)}>
                <Ionicons name="close" size={24} color={C.red} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={C.red}
              style={styles.input}
              maxLength={60}
              autoCapitalize="words"
            />

            <View style={styles.calendarHeader}>
              <Text style={styles.label}>BIRTHDAY</Text>
              <View style={styles.monthControls}>
                <TouchableOpacity
                  onPress={() => changeMonth(-1)}
                  hitSlop={10}
                  accessibilityLabel="Previous month"
                >
                  <Ionicons name="chevron-back" size={20} color={C.red} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{MONTHS[date.getMonth()]}</Text>
                <TouchableOpacity
                  onPress={() => changeMonth(1)}
                  hitSlop={10}
                  accessibilityLabel="Next month"
                >
                  <Ionicons name="chevron-forward" size={20} color={C.red} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.calendar}>
              {WEEKDAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekday}>
                  {day}
                </Text>
              ))}
              {Array.from({ length: 42 }, (_, index) => {
                const firstWeekday = new Date(
                  2000,
                  date.getMonth(),
                  1,
                ).getDay();
                const day = index - firstWeekday + 1;
                const daysInMonth = new Date(
                  2000,
                  date.getMonth() + 1,
                  0,
                ).getDate();
                const isSelected = day === date.getDate();

                return day < 1 || day > daysInMonth ? (
                  <View key={`empty-${index}`} style={styles.calendarCell} />
                ) : (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.selectedDay,
                    ]}
                    onPress={() => selectDay(day)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${MONTHS[date.getMonth()]} ${day}`}
                  >
                    <Text
                      style={[
                        styles.calendarDay,
                        isSelected && styles.selectedDayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={addBirthday}>
              <Text style={styles.saveText}>Save birthday</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setDrawer(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 28,
    color: C.red,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontFamily: F.bold,
    fontSize: 21,
    color: C.red,
    marginBottom: 12,
  },
  empty: {
    fontFamily: F.regular,
    fontSize: 14,
    color: C.cyan,
    paddingVertical: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.orange,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 10,
  },
  todayItem: {
    borderColor: C.green,
    backgroundColor: '#E2F3E5',
  },
  itemText: {
    flex: 1,
  },
  name: {
    fontFamily: F.medium,
    fontSize: 16,
    color: C.red,
  },
  dateText: {
    fontFamily: F.regular,
    fontSize: 13,
    color: C.cyan,
    marginTop: 4,
  },
  todayText: {
    color: C.green,
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  drawer: {
    backgroundColor: C.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.orange,
    marginBottom: 22,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  drawerTitle: {
    fontFamily: F.bold,
    fontSize: 24,
    color: C.red,
  },
  label: {
    fontFamily: F.medium,
    fontSize: 11,
    color: C.red,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: C.orange,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: F.regular,
    fontSize: 15,
    color: C.red,
    marginBottom: 22,
  },
  calendarHeader: {
    marginBottom: 8,
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthTitle: {
    fontFamily: F.medium,
    color: C.red,
    fontSize: 16,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    fontFamily: F.bold,
    color: C.cyan,
    fontSize: 12,
    paddingVertical: 8,
  },
  calendarCell: {
    width: '14.2857%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  calendarDay: {
    fontFamily: F.medium,
    color: C.red,
    fontSize: 13,
  },
  selectedDay: {
    backgroundColor: C.red,
  },
  selectedDayText: {
    color: C.cream,
  },
  swipePrompt: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.orange,
  },
  swipePromptButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  swipeHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.orange,
    marginBottom: 5,
  },
  swipePromptText: {
    fontFamily: F.medium,
    color: C.red,
    fontSize: 14,
    marginTop: 5,
  },
  saveButton: {
    marginTop: 25,
    height: 52,
    borderRadius: 12,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: F.bold,
    color: C.cream,
    fontSize: 15,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 15,
  },
  cancelText: {
    fontFamily: F.medium,
    color: C.cyan,
    fontSize: 14,
  },
});
