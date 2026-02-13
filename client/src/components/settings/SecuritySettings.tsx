import { useState } from 'react';
import { Title, Card, Stack, Text, Group, PasswordInput, Button } from '@mantine/core';
import { useAppStore } from '../../store';
import { translations } from '../../i18n';

export const SecuritySettings = () => {
  const { changePassword, isLoading, language } = useAppStore();
  const t = translations[language];

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    try {
        await changePassword(currentPassword, newPassword);
        setCurrentPassword('');
        setNewPassword('');
    } catch (e) {}
  };

  return (
    <>
      <Title order={3} mb="md">{t.security}</Title>
      <Card withBorder shadow="sm" radius="md" mb="xl">
          <form autoComplete="off">
          <Stack gap="md">
              <Text fw={500}>{t.security}</Text>
              <input type="text" style={{display: 'none'}} autoComplete="username" />
              <input type="password" style={{display: 'none'}} autoComplete="current-password" />

              <Group align="flex-end">
                  <PasswordInput 
                      label={t.currentPassword} 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                      autoComplete="current-password"
                      name="current_password_field"
                  />
                  <PasswordInput 
                      label={t.newPassword} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.currentTarget.value)}
                      autoComplete="new-password"
                      name="new_password_field"
                  />
                  <Button 
                      onClick={handleChangePassword} 
                      loading={isLoading}
                      disabled={!currentPassword || !newPassword}
                  >
                      {t.update}
                  </Button>
              </Group>
          </Stack>
          </form>
      </Card>
    </>
  );
};
