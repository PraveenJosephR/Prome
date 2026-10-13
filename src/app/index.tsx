
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  PanResponder,
  Platform,
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
  notificationId?: string;
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
  const [birthdayToRemove, setBirthdayToRemove] = useState<Birthday | null>(
    null,
  );
  const [drawer, setDrawer] = useState(false);
  const [name, setName] = useState('');
  const [isSavingBirthday, setIsSavingBirthday] = useState(false);
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

  const addBirthday = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name.');
      return;
    }

    if (isSavingBirthday) return;

    setIsSavingBirthday(true);
    const birthday: Birthday = {
      id: `${Date.now()}-${Math.random()}`,
      name: name.trim(),
      date: toISO(date),
    };

    let reminderWarning: string | null = null;
    try {
      if (Platform.OS === 'web') {
        reminderWarning =
          'Birthday notifications are supported on Android and iOS.';
      } else {
        const Notifications = await import('expo-notifications');

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(
            'birthday-reminders',
            {
              name: 'Birthday reminders',
              importance: Notifications.AndroidImportance.HIGH,
            },
          );
        }

        const currentPermission = await Notifications.getPermissionsAsync();
        const permission =
          currentPermission.status === 'granted'
            ? currentPermission
            : await Notifications.requestPermissionsAsync();

        if (permission.status !== 'granted') {
          reminderWarning =
            'Allow notifications in your device settings to receive birthday reminders.';
        } else {
          const birthdayDate = fromISO(birthday.date);
          birthday.notificationId =
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `It's ${birthday.name}'s birthday!`,
                body: `Wish ${birthday.name} a happy birthday today.`,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.YEARLY,
                month: birthdayDate.getMonth(),
                day: birthdayDate.getDate(),
                hour: 10,
                minute: 0,
                ...(Platform.OS === 'android'
                  ? { channelId: 'birthday-reminders' }
                  : {}),
              },
            });
        }
      }
    } catch (error) {
      reminderWarning = `The reminder could not be scheduled. ${
        error instanceof Error ? error.message : 'An unknown error occurred.'
      }`;
    }

    setBirthdays((prev) => [...prev, birthday]);
    setDrawer(false);
    setName('');
    setIsSavingBirthday(false);

    if (reminderWarning) {
      Alert.alert('Birthday saved without a reminder', reminderWarning);
    }
  };

  const removeBirthday = (b: Birthday) => {
    setBirthdayToRemove(b);
  };

  const confirmRemoveBirthday = async () => {
    if (!birthdayToRemove) return;

    const birthday = birthdayToRemove;
    setBirthdayToRemove(null);
    setBirthdays((prev) => prev.filter((item) => item.id !== birthday.id));

    if (birthday.notificationId) {
      try {
        const Notifications = await import('expo-notifications');
        await Notifications.cancelScheduledNotificationAsync(
          birthday.notificationId,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'An unknown error occurred.';
        Alert.alert(
          'Birthday removed',
          `Its reminder could not be canceled and may still appear. ${message}`,
        );
      }
    }
  };

  const exportBirthdays = async () => {
    if (birthdays.length === 0) {
      Alert.alert('No birthdays to export', 'Add a birthday before exporting.');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(
        'Export unavailable',
        'TXT file sharing is available in the Android and iOS app.',
      );
      return;
    }

    try {
      const [Sharing, { File, Paths }] = await Promise.all([
        import('expo-sharing'),
        import('expo-file-system'),
      ]);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot share files.');
        return;
      }

      const lines = birthdays
        .slice()
        .sort((a, b) => keyOf(a.date) - keyOf(b.date))
        .map((birthday) => `${birthday.name} - ${formatDate(birthday.date)}`);
      const content = [
        'Prome birthday backup',
        `Exported ${new Date().toLocaleDateString()}`,
        '',
        ...lines,
        '',
      ].join('\n');
      const file = new File(
        Paths.cache,
        `prome-birthday-backup-${toISO(new Date())}.txt`,
      );
      file.create({ overwrite: true });
      file.write(content);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/plain',
        UTI: 'public.plain-text',
        dialogTitle: 'Share birthday backup',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      Alert.alert('Export failed', `The backup could not be shared. ${message}`);
    }
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
          {title === 'upcoming'
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
        <TouchableOpacity
          style={styles.exportButton}
          onPress={exportBirthdays}
          accessibilityRole="button"
          accessibilityLabel="Export birthday backup"
        >
          <Ionicons name="share-outline" size={21} color={C.red} />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[{ key: 'birthdays' }]}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.content}
        renderItem={() => (
          <>
            {renderSection('upcoming', upcoming)}
            {renderSection('completed', completed)}
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

            <TouchableOpacity
              style={[styles.saveButton, isSavingBirthday && styles.disabled]}
              onPress={addBirthday}
              disabled={isSavingBirthday}
            >
              <Text style={styles.saveText}>
                {isSavingBirthday ? 'Saving...' : 'Save birthday'}
              </Text>
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

      <Modal
        visible={birthdayToRemove !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBirthdayToRemove(null)}
      >
        <View style={styles.confirmationOverlay}>
          <TouchableOpacity
            style={styles.confirmationBackdrop}
            activeOpacity={1}
            onPress={() => setBirthdayToRemove(null)}
            accessibilityLabel="Cancel removal"
          />
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Remove birthday?</Text>
            <Text style={styles.confirmationMessage}>
              Remove {birthdayToRemove?.name}&apos;s birthday?
            </Text>
            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.keepButton}
                onPress={() => setBirthdayToRemove(null)}
              >
                <Text style={styles.keepText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={confirmRemoveBirthday}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 28,
    color: C.red,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: C.orange,
    borderRadius: 12,
  },
  exportText: {
    fontFamily: F.medium,
    fontSize: 13,
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
  disabled: {
    opacity: 0.6,
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
  confirmationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  confirmationBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  confirmationCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.orange,
    borderRadius: 20,
  },
  confirmationTitle: {
    fontFamily: F.bold,
    fontSize: 21,
    color: C.red,
  },
  confirmationMessage: {
    fontFamily: F.regular,
    fontSize: 15,
    color: C.red,
    marginTop: 10,
  },
  confirmationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },
  keepButton: {
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.cyan,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  keepText: {
    fontFamily: F.medium,
    color: C.cyan,
  },
  removeButton: {
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.red,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  removeText: {
    fontFamily: F.bold,
    color: C.cream,
  },
});
