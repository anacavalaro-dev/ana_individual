import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  Platform,
  Dimensions,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// ============================================================
// TELAS
// ============================================================

import telaLogin from './screens/telaLogin';
import telaHome from './screens/telaHome';
import telaDashboard from './screens/telaDashboard';
import telamov from './screens/telamov';
import telaScanner from './screens/telaScanner';
import telaPerfil from './screens/telaPerfil';

// ============================================================
// NAVEGADORES
// ============================================================

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();

// ============================================================
// CORES MEDSTOCK
// ============================================================

const C = {
  white: '#FFFFFF',
  deep: '#123A73',
  teal: '#008F95',
  muted: '#8A98AB',
  border: '#E6ECF3',
  activeBg: '#00bec421',
};

// ============================================================
// ÍCONES
// ============================================================

const ICONES = {
  Home: { ativo: 'home', inativo: 'home-outline' },
  Dashboard: { ativo: 'view-dashboard', inativo: 'view-dashboard-outline' },
  Escanear: { ativo: 'barcode-scan', inativo: 'barcode-scan' },
  Movimentação: { ativo: 'swap-horizontal-bold', inativo: 'swap-horizontal' },
  Perfil: { ativo: 'account-circle', inativo: 'account-circle-outline' },
};

// ============================================================
// MEDIDAS
// ============================================================

const BAR_PADDING_H = 6; // mesmo valor de styles.bar.paddingHorizontal
const BAR_HEIGHT = 60;
const PILL_WIDTH = 58;
const PILL_HEIGHT = 46;

const LARGURA_TELA = Dimensions.get('window').width;

// ============================================================
// ITEM DA BARRA
// ============================================================

function TabItem({ label, iconName, focused, onPress, onLongPress }) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [focused, anim]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
        <MaterialCommunityIcons
          name={iconName}
          size={25}
          color={focused ? C.deep : C.muted}
        />
      </Animated.View>
    </Pressable>
  );
}

// ============================================================
// BOTÃO CENTRAL - SCANNER
// ============================================================

function ScannerButton({ label, focused, onPress, onLongPress }) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [focused, anim]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.scannerPressable}
    >
      <Animated.View style={[styles.scannerBtn, { transform: [{ scale }] }]}>
        <MaterialCommunityIcons name="barcode-scan" size={28} color={C.white} />
      </Animated.View>
    </Pressable>
  );
}

// ============================================================
// BARRA INFERIOR COM BLUR + PÍLULA QUE ACOMPANHA O SWIPE
// ============================================================

function CustomTabBar({ state, descriptors, navigation, position }) {
  const insets = useSafeAreaInsets();

  // Largura da barra (medida em tempo de execução)
  const [barWidth, setBarWidth] = useState(0);

  const total = state.routes.length;
  const slotWidth = barWidth > 0 ? (barWidth - BAR_PADDING_H * 2) / total : 0;

  const scannerIndex = state.routes.findIndex((r) => r.name === 'Escanear');
  const rotaScanner = scannerIndex >= 0 ? state.routes[scannerIndex] : null;
  const scannerFocused = state.index === scannerIndex;

  // A pílula é guiada pelo "position" do pager (índice fracionado:
  // 0, 0.3, 1.0, 1.7...), então ela anda junto com o dedo.
  const pill = useMemo(() => {
    if (!position || slotWidth === 0) return null;

    const indices = state.routes.map((_, i) => i);

    // Posição X da pílula em cada aba
    const xs = indices.map(
      (i) => BAR_PADDING_H + slotWidth * i + (slotWidth - PILL_WIDTH) / 2
    );

    const translateX = position.interpolate({
      inputRange: indices,
      outputRange: xs,
      extrapolate: 'clamp',
    });

    // Leve "esticada" no meio do caminho entre uma aba e outra
    const entrada = [];
    const saida = [];
    indices.forEach((i) => {
      entrada.push(i);
      saida.push(1);
      if (i < indices.length - 1) {
        entrada.push(i + 0.5);
        saida.push(1.18);
      }
    });

    const scaleX = position.interpolate({
      inputRange: entrada,
      outputRange: saida,
      extrapolate: 'clamp',
    });

    // Some quando chega no Scanner (botão central), volta nas outras
    const opacity =
      scannerIndex >= 0
        ? position.interpolate({
            inputRange: [
              scannerIndex - 1,
              scannerIndex - 0.45,
              scannerIndex,
              scannerIndex + 0.45,
              scannerIndex + 1,
            ],
            outputRange: [1, 0, 0, 0, 1],
            extrapolate: 'clamp',
          })
        : 1;

    return { translateX, scaleX, opacity };
  }, [position, slotWidth, state.routes.length, scannerIndex]);

  const criarHandlers = (route, focused) => ({
    onPress: () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!focused && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        navigation.navigate(route.name, route.params);
      }
    },

    onLongPress: () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    },
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      {/* FUNDO DESFOCADO */}
      <BlurView
        intensity={55}
        tint="light"
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dimezisBlurView' : 'none'
        }
        style={styles.barBlur}
      >
        {/* CONTEÚDO DA BARRA */}
        <View
          style={styles.bar}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* PÍLULA QUE ACOMPANHA O DEDO */}
          {pill ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.slidingPill,
                {
                  opacity: pill.opacity,
                  transform: [
                    { translateX: pill.translateX },
                    { scaleX: pill.scaleX },
                  ],
                },
              ]}
            />
          ) : null}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;

            // Espaço reservado para o scanner central
            if (route.name === 'Escanear') {
              return <View key={route.key} style={styles.item} />;
            }

            const icones = ICONES[route.name] || ICONES.Home;
            const { onPress, onLongPress } = criarHandlers(route, focused);

            return (
              <TabItem
                key={route.key}
                label={options.title || route.name}
                iconName={focused ? icones.ativo : icones.inativo}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </BlurView>

      {/* BOTÃO CENTRAL FORA DO BLUR */}
      {rotaScanner ? (
        <View pointerEvents="box-none" style={styles.scannerLayer}>
          <ScannerButton
            label={descriptors[rotaScanner.key].options.title || 'Escanear'}
            focused={!!scannerFocused}
            {...criarHandlers(rotaScanner, !!scannerFocused)}
          />
        </View>
      ) : null}
    </View>
  );
}

// ============================================================
// ABAS (COM SWIPE LATERAL)
// ============================================================

function BottomTabs({ route }) {
  const cliente =
    route?.params?.cliente ||
    route?.params?.usuario ||
    route?.params?.user ||
    null;

  const paramsIniciais = {
    cliente,
    usuario: cliente,
    user: cliente,
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBarPosition="bottom"
      tabBar={(props) => <CustomTabBar {...props} />}
      initialLayout={{ width: LARGURA_TELA }}
      screenOptions={{
        swipeEnabled: true,            // <- liga o deslizar entre telas
        animationEnabled: true,
        keyboardDismissMode: 'on-drag',
        lazy: true,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={telaHome}
        initialParams={paramsIniciais}
        options={{ title: 'Início', lazy: false }}
      />

      <Tab.Screen
        name="Dashboard"
        component={telaDashboard}
        initialParams={paramsIniciais}
        options={{ title: 'Dashboard', lazy: false }}
      />

      {/* Scanner continua lazy para a câmera não abrir sozinha */}
      <Tab.Screen
        name="Escanear"
        component={telaScanner}
        initialParams={paramsIniciais}
        options={{ title: 'Escanear' }}
      />

      <Tab.Screen
        name="Movimentação"
        component={telamov}
        initialParams={paramsIniciais}
        options={{ title: 'Movimentos', lazy: false }}
      />

      <Tab.Screen
        name="Perfil"
        component={telaPerfil}
        initialParams={paramsIniciais}
        options={{ title: 'Perfil', lazy: false }}
      />
    </Tab.Navigator>
  );
}

// ============================================================
// APLICAÇÃO PRINCIPAL
// ============================================================

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      >
        <Stack.Screen name="Login" component={telaLogin} />

        <Stack.Screen
          name="Sistema"
          component={BottomTabs}
          options={{
            animation: 'fade_from_bottom',
            animationDuration: 400,

            // Impede voltar para o Login com gesto
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const styles = StyleSheet.create({
  // Área externa da barra
  wrapper: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
  },

  // Camada que aplica o desfoque
  barBlur: {
    height: BAR_HEIGHT,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.75)',

    shadowColor: C.deep,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  // Conteúdo transparente sobre o BlurView
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BAR_PADDING_H,
    backgroundColor: 'transparent',
  },

  // Pílula (posição horizontal vem 100% do translateX)
  slidingPill: {
    position: 'absolute',
    left: 0,
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: 22,
    backgroundColor: C.activeBg,
  },

  // Área de cada ícone (ocupa a altura toda, para o toque funcionar)
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrap: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Camada do scanner central
  scannerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  scannerPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  scannerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: C.white,

    shadowColor: C.teal,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
});