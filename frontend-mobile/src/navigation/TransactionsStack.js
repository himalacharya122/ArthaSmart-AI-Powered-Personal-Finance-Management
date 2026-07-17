/**
 * Transactions stack navigator.
 *
 * TransactionsTab --> TransactionsScreen (list)
 *                 --> AddExpenseScreen
 *                 --> AddIncomeScreen
 */
import { createStackNavigator } from '@react-navigation/stack';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { AddExpenseScreen } from '../screens/transactions/AddExpenseScreen';
import { AddIncomeScreen } from '../screens/transactions/AddIncomeScreen';
import { TransactionDetailScreen } from '../screens/transactions/TransactionDetailScreen';
import { ExportDataScreen } from '../screens/settings/ExportDataScreen';
import { SuccessScreen } from '../screens/common/SuccessScreen';
import { SCREEN_NAMES } from '../utils/constants';

const Stack = createStackNavigator();

export function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={SCREEN_NAMES.TRANSACTIONS} component={TransactionsScreen} />
      <Stack.Screen name={SCREEN_NAMES.ADD_EXPENSE} component={AddExpenseScreen} />
      <Stack.Screen name={SCREEN_NAMES.ADD_INCOME} component={AddIncomeScreen} />
      <Stack.Screen name={SCREEN_NAMES.TRANSACTION_DETAIL} component={TransactionDetailScreen} />
      <Stack.Screen name={SCREEN_NAMES.EXPORT_DATA} component={ExportDataScreen} />
      <Stack.Screen name={SCREEN_NAMES.SUCCESS} component={SuccessScreen} />
    </Stack.Navigator>
  );
}
