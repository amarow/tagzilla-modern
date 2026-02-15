import { useState } from 'react';
import { Container, Card, Center, Stack, Alert, TextInput, PasswordInput, Button, Text } from '@mantine/core';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { ScriniaLogo } from './Logo';

export const Login = () => {
  const { login, register, isLoading, error: storeError, language } = useAppStore();
  const t = translations[language];

  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleAuthSubmit = async () => {
    if (!username || !password) return;
    if (isRegistering) {
        await register(username, password);
        setIsRegistering(false); 
    } else {
        await login(username, password);
    }
  };

  return (
    <Container size="xs" mt="xl">
        <Card withBorder shadow="sm" p="xl" radius="md">
            <Center mb="xl">
              <ScriniaLogo size={120} />
            </Center>
            <Stack>
                {storeError && <Alert color="red" title="Error">{storeError}</Alert>}
                <TextInput 
                  label={t.username} 
                  placeholder={t.username} 
                  required 
                  value={username} 
                  onChange={(e) => setUsername(e.currentTarget.value)}
                />
                <PasswordInput 
                  label={t.password} 
                  placeholder={t.password} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                />
                <Button fullWidth mt="md" onClick={handleAuthSubmit} loading={isLoading}>
                    {isRegistering ? t.register : t.login}
                </Button>
                <Text c="dimmed" size="sm" ta="center" style={{ cursor: 'pointer' }} onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering ? t.alreadyHaveAccount : t.dontHaveAccount}
                </Text>
            </Stack>
        </Card>
    </Container>
  );
};
