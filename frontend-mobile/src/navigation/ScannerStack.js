/**
 * Scanner stack navigator.
 *
 * Scanner (hub) --> ScanProcessing --> ScanReview
 *                                  --> ReceiptsHistory
 */
import { createStackNavigator } from '@react-navigation/stack';
import { ScannerScreen } from '../screens/scanner/ScannerScreen';
import { ScanProcessingScreen } from '../screens/scanner/ScanProcessingScreen';
import { ReceiptReviewScreen } from '../screens/scanner/ReceiptReviewScreen';
import { ReceiptHistoryScreen } from '../screens/scanner/ReceiptHistoryScreen';
import { SCREEN_NAMES } from '../utils/constants';

const Stack = createStackNavigator();

export function ScannerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={SCREEN_NAMES.SCANNER} component={ScannerScreen} />
      <Stack.Screen name={SCREEN_NAMES.SCAN_PROCESSING} component={ScanProcessingScreen} />
      <Stack.Screen name={SCREEN_NAMES.SCAN_REVIEW} component={ReceiptReviewScreen} />
      <Stack.Screen name={SCREEN_NAMES.RECEIPTS_HISTORY} component={ReceiptHistoryScreen} />
    </Stack.Navigator>
  );
}
