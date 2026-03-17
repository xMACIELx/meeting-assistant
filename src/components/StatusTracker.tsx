import React from 'react';
import { View, Text } from 'react-native';

interface StatusTrackerProps {
  status: 'Agendada' | 'Em Andamento' | 'Concluída';
}

const statuses = ['Agendada', 'Em Andamento', 'Concluída'];

export function StatusTracker({ status }: StatusTrackerProps) {
  const currentIndex = statuses.indexOf(status);

  return (
    <View className="flex-row items-center justify-between w-full mt-4">
      {statuses.map((item, index) => {
        const isCompleted = index <= currentIndex;
        const isLast = index === statuses.length - 1;

        return (
          <React.Fragment key={item}>
            <View className="items-center flex-1">
              <View
                className={`w-6 h-6 rounded-full items-center justify-center border-2 ${
                  isCompleted ? 'bg-[#00FF88] border-[#00FF88]' : 'bg-transparent border-neutral-600'
                }`}
              >
                {isCompleted && (
                  <View className="w-2 h-2 rounded-full bg-black" />
                )}
              </View>
              <Text
                className={`text-[10px] sm:text-xs mt-2 text-center font-interMedium ${
                  isCompleted ? 'text-[#00FF88]' : 'text-neutral-500'
                }`}
              >
                {item}
              </Text>
            </View>
            {!isLast && (
              <View
                className={`h-[2px] flex-1 mx-1 rounded-full ${
                  index < currentIndex ? 'bg-[#00FF88]' : 'bg-neutral-800'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
