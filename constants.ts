
import { Station, Status } from './types';

export const MAP_CENTER_HANOI: [number, number] = [21.00, 105.80]; // Adjusted slightly north to center new points
export const DEFAULT_ZOOM = 13;

// Mock data simulating the IoT system state
export const MOCK_STATIONS: Station[] = [
  {
    id: 'NODE-01',
    name: 'Trieu Khuc Station (Real-time)',
    location: 'Thanh Xuan District',
    lat: 20.984,
    lng: 105.798,
    currentLevel: 100,
    threshold: 25,
    status: Status.DANGER,
    lastUpdated: new Date().toISOString(),
    isAutoWarning: true,
    history: [
      { timestamp: '10:00', level: 15 },
      { timestamp: '10:05', level: 22 },
      { timestamp: '10:10', level: 45 },
      { timestamp: '10:15', level: 60 },
      { timestamp: '10:20', level: 85 },
      { timestamp: '10:25', level: 98 },
      { timestamp: '10:30', level: 100 },
    ],
    blynkToken: '9BgSC2RVO-WHwUo1BrABJedV4G18mvNw'
  },
  {
    id: 'NODE-02',
    name: 'Nguyen Chi Thanh',
    location: 'Dong Da District', // 3-89 Đ. Nguyễn Chí Thanh
    lat: 21.020927,
    lng: 105.808918,
    currentLevel: 18,
    threshold: 20,
    status: Status.WARNING,
    lastUpdated: new Date().toISOString(),
    isAutoWarning: true,
    history: [
      { timestamp: '10:00', level: 5 },
      { timestamp: '10:10', level: 10 },
      { timestamp: '10:20', level: 15 },
      { timestamp: '10:30', level: 18 },
    ]
  },
  {
    id: 'NODE-03',
    name: 'Chua Boc Street',
    location: 'Dong Da District', // 231-205 P. Chùa Bộc
    lat: 21.008443,
    lng: 105.826367,
    currentLevel: 2,
    threshold: 30,
    status: Status.SAFE,
    lastUpdated: new Date().toISOString(),
    isAutoWarning: false,
    history: [
      { timestamp: '10:00', level: 2 },
      { timestamp: '10:10', level: 3 },
      { timestamp: '10:20', level: 2 },
      { timestamp: '10:30', level: 2 },
    ]
  },
  {
    id: 'NODE-04',
    name: '190-208 Van Phuc Street',
    location: 'Ha Dong District', // 190-208 Đường Vạn Phúc
    lat: 20.983064,
    lng: 105.770016,
    currentLevel: 45,
    threshold: 30,
    status: Status.DANGER,
    lastUpdated: new Date().toISOString(),
    isAutoWarning: true,
    history: [
      { timestamp: '10:00', level: 20 },
      { timestamp: '10:10', level: 25 },
      { timestamp: '10:20', level: 35 },
      { timestamp: '10:30', level: 45 },
    ]
  },
  {
    id: 'NODE-05',
    name: 'Nguyen Xien Road',
    location: 'Thanh Xuan District', // Nguyễn Xiển
    lat: 20.986845,
    lng: 105.806676,
    currentLevel: 12,
    threshold: 25,
    status: Status.WARNING,
    lastUpdated: new Date().toISOString(),
    isAutoWarning: true,
    history: [
      { timestamp: '10:00', level: 5 },
      { timestamp: '10:10', level: 8 },
      { timestamp: '10:20', level: 10 },
      { timestamp: '10:30', level: 12 },
    ]
  }
];

export const STATUS_COLORS = {
  [Status.SAFE]: '#10b981',   // emerald-500
  [Status.WARNING]: '#f59e0b', // amber-500
  [Status.DANGER]: '#ef4444',  // red-500
};
