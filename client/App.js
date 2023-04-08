import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import GroupCall from './GroupCall';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <GroupCall />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
