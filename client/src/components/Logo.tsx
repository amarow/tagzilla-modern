import { Box, Text, Group } from '@mantine/core';

export const ScriniaLogo = ({ size = 80, showText = true }: { size?: number, showText?: boolean }) => {
  return (
    <Box style={{ textAlign: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Scrinium / Chest - Representing storage and history */}
        <rect x="20" y="40" width="60" height="45" rx="4" fill="#228be6" />
        <rect x="20" y="30" width="60" height="15" rx="4" fill="#1c7ed6" />
        
        {/* Lock - Representing Privacy */}
        <path
          d="M40 35 V 25 C 40 20, 45 15, 50 15 C 55 15, 60 20, 60 25 V 35"
          stroke="#1c7ed6"
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Keyhole / Detail */}
        <circle cx="50" cy="55" r="5" fill="white" />
        <rect x="48" y="55" width="4" height="10" rx="1" fill="white" />
      </svg>
      
      {showText && (
        <Group gap={0} justify="center" mt={5}>
          <Text fw={900} size="xl" c="blue.7" style={{ letterSpacing: -0.5 }}>Scrinia</Text>
        </Group>
      )}
    </Box>
  );
};
