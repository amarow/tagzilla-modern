import { useState } from 'react';
import { Title, Card, Group, Stack, Text, Button, ActionIcon, Table, Switch, Modal, TextInput, Select, Paper, Center } from '@mantine/core';
import { IconPlus, IconShieldLock, IconSettings, IconTrash, IconCheck, IconCopy } from '@tabler/icons-react';
import { useAppStore } from '../../store';
import { translations } from '../../i18n';
import { modals } from '@mantine/modals';

export const PrivacySettings = () => {
  const { 
    privacyProfiles, createPrivacyProfile, deletePrivacyProfile, updatePrivacyProfile,
    fetchPrivacyRules, addPrivacyRule, deletePrivacyRule, updatePrivacyRule,
    language, isLoading 
  } = useAppStore();
  const t = translations[language];

  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [activeProfileName, setActiveProfileName] = useState('');
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [rules, setRules] = useState<any[]>([]);

  const refreshRules = async (profileId: number) => {
      const r = await fetchPrivacyRules(profileId);
      setRules(r);
  };

  const handleUpdateRule = async (id: number, updates: any) => {
      await updatePrivacyRule(id, updates);
      if (activeProfileId) refreshRules(activeProfileId);
  };

  const handleAddEmptyRule = async () => {
      if (!activeProfileId) return;
      await addPrivacyRule(activeProfileId, {
          type: 'LITERAL',
          pattern: '',
          replacement: '[REDACTED]'
      });
      refreshRules(activeProfileId);
  };

  const handleCloneRule = async (rule: any) => {
      if (!activeProfileId) return;
      await addPrivacyRule(activeProfileId, {
          type: rule.type,
          pattern: `${rule.pattern} (Copy)`,
          replacement: rule.replacement
      });
      refreshRules(activeProfileId);
  };

  return (
    <>
      <Title order={3} mb="md">{t.privacy}</Title>
      <Card withBorder shadow="sm" radius="md" mb="xl">
          <Card.Section withBorder inheritPadding py="xs">
              <Group justify="space-between">
                  <Stack gap={0}>
                      <Text fw={500}>{t.privacy}</Text>
                      <Text size="xs" c="dimmed">{t.privacyDesc}</Text>
                  </Stack>
                  <Button 
                      leftSection={<IconPlus size={16} />} 
                      variant="light" 
                      size="xs" 
                      onClick={() => {
                          setActiveProfileId(null);
                          setActiveProfileName('');
                          setRules([]);
                          setIsRulesModalOpen(true);
                      }}
                  >
                      {t.add}
                  </Button>
              </Group>
          </Card.Section>

          <Stack gap="xs" mt="md">
              {privacyProfiles.length === 0 && (
                  <Text c="dimmed" ta="center" py="md">No privacy profiles created yet.</Text>
              )}
              
              {privacyProfiles.map(profile => (
                  <Group key={profile.id} justify="space-between" p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: '4px' }}>
                      <Group>
                          <IconShieldLock size={20} color="gray" />
                          <div>
                              <Text size="sm" fw={500}>{profile.name}</Text>
                              <Text size="xs" c="dimmed">{profile.ruleCount} {t.rules}</Text>
                          </div>
                      </Group>
                      <Group gap="xs">
                          <ActionIcon 
                              variant="light" 
                              onClick={async () => {
                                  const r = await fetchPrivacyRules(profile.id);
                                  setRules(r);
                                  setActiveProfileId(profile.id);
                                  setActiveProfileName(profile.name);
                                  setIsRulesModalOpen(true);
                              }}
                          >
                              <IconSettings size={16} />
                          </ActionIcon>
                          <ActionIcon 
                              variant="light" 
                              color="red"
                              onClick={() => { 
                                  modals.openConfirmModal({
                                      title: t.deleteProfileTitle,
                                      children: <Text size="sm">{t.areYouSure}</Text>,
                                      labels: { confirm: t.delete, cancel: t.cancel },
                                      confirmProps: { color: 'red' },
                                      onConfirm: () => deletePrivacyProfile(profile.id),
                                  });
                              }}
                          >
                              <IconTrash size={16} />
                          </ActionIcon>
                      </Group>
                  </Group>
              ))}
          </Stack>
      </Card>

      <Modal 
          opened={isRulesModalOpen} 
          onClose={() => setIsRulesModalOpen(false)} 
          title={t.anonymization}
          size="xl"
      >
          <Stack>
              <Group align="flex-end">
                  <TextInput 
                      label={t.profileName}
                      placeholder="e.g. My Privacy Rules"
                      value={activeProfileName}
                      onChange={(e) => setActiveProfileName(e.currentTarget.value)}
                      style={{ flex: 1 }}
                      autoFocus={!activeProfileId}
                  />
                  <Button 
                      variant="light"
                      onClick={async () => {
                          if (activeProfileId) {
                              await updatePrivacyProfile(activeProfileId, activeProfileName);
                          } else if (activeProfileName.trim()) {
                              const newProfile = await createPrivacyProfile(activeProfileName.trim());
                              if (newProfile) {
                                  setActiveProfileId(newProfile.id);
                                  setActiveProfileName(newProfile.name);
                              }
                          }
                      }}
                      disabled={!activeProfileName.trim()}
                      loading={isLoading}
                  >
                      <IconCheck size={16} />
                  </Button>
              </Group>

              {activeProfileId ? (
                  <>
                      <Group justify="space-between" align="center" mt="md">
                          <Text fw={500} size="sm">{t.rules}</Text>
                          <Button 
                              size="xs" 
                              variant="light" 
                              leftSection={<IconPlus size={14} />}
                              onClick={handleAddEmptyRule}
                              loading={isLoading}
                          >
                              {t.add}
                          </Button>
                      </Group>

                      <Table striped highlightOnHover withTableBorder mt="xs">
                          <thead>
                              <tr>
                                  <th style={{ width: 120, textAlign: 'left' }}>{t.type}</th>
                                  <th style={{ textAlign: 'left' }}>{t.pattern}</th>
                                  <th style={{ width: 150, textAlign: 'left' }}>{t.replacement}</th>
                                  <th style={{ width: 60, textAlign: 'left' }}>{t.active}</th>
                                  <th style={{ width: 90 }}></th>
                              </tr>
                          </thead>
                          <tbody>
                              {rules.map(rule => (
                                  <tr key={rule.id}>
                                      <td>
                                          <Select 
                                              size="xs"
                                              variant="unstyled"
                                              data={[
                                                  { value: 'LITERAL', label: t.literal },
                                                  { value: 'REGEX', label: t.regex },
                                                  { value: 'EMAIL', label: t.email },
                                                  { value: 'IBAN', label: t.iban },
                                                  { value: 'IPV4', label: t.ipv4 },
                                                  { value: 'PHONE', label: t.phone }
                                              ]}
                                              value={rule.type}
                                              onChange={(val) => handleUpdateRule(rule.id, { type: val })}
                                          />
                                      </td>
                                      <td>
                                          <TextInput 
                                              size="xs"
                                              variant="unstyled"
                                              value={rule.pattern}
                                              placeholder={rule.type === 'LITERAL' || rule.type === 'REGEX' ? t.pattern : '---'}
                                              disabled={rule.type !== 'LITERAL' && rule.type !== 'REGEX'}
                                              onChange={(e) => {
                                                  const newPattern = e.currentTarget.value;
                                                  const newRules = rules.map(r => r.id === rule.id ? { ...r, pattern: newPattern } : r);
                                                  setRules(newRules);
                                              }}
                                              onBlur={(e) => handleUpdateRule(rule.id, { pattern: e.currentTarget.value })}
                                              styles={{ input: { fontFamily: 'monospace' } }}
                                          />
                                      </td>
                                      <td>
                                          <TextInput 
                                              size="xs"
                                              variant="unstyled"
                                              value={rule.replacement}
                                              placeholder={t.replacement}
                                              onChange={(e) => {
                                                  const newRepl = e.currentTarget.value;
                                                  const newRules = rules.map(r => r.id === rule.id ? { ...r, replacement: newRepl } : r);
                                                  setRules(newRules);
                                              }}
                                              onBlur={(e) => handleUpdateRule(rule.id, { replacement: e.currentTarget.value })}
                                          />
                                      </td>
                                      <td style={{ textAlign: 'left' }}>
                                          <Switch 
                                              checked={!!rule.isActive}
                                              onChange={async (e) => {
                                                  await handleUpdateRule(rule.id, { isActive: e.currentTarget.checked });
                                              }}
                                              size="xs"
                                          />
                                      </td>
                                      <td>
                                          <Group gap={4} wrap="nowrap">
                                              <ActionIcon 
                                                  variant="subtle" 
                                                  color="blue" 
                                                  size="sm"
                                                  onClick={() => handleCloneRule(rule)}
                                              >
                                                  <IconCopy size={14} />
                                              </ActionIcon>
                                              <ActionIcon 
                                                  variant="subtle" 
                                                  color="red" 
                                                  size="sm"
                                                  onClick={async () => {
                                                      await deletePrivacyRule(rule.id);
                                                      refreshRules(activeProfileId);
                                                  }}
                                              >
                                                  <IconTrash size={14} />
                                              </ActionIcon>
                                          </Group>
                                      </td>
                                  </tr>
                              ))}
                              {rules.length === 0 && (
                                  <tr>
                                      <td colSpan={5}>
                                          <Text size="xs" c="dimmed" ta="center" py="sm">No rules defined yet.</Text>
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </Table>
                  </>
              ) : (
                  <Paper withBorder p="md" style={{ borderStyle: 'dashed', opacity: 0.6 }}>
                      <Center>
                          <Text size="sm" c="dimmed">{t.rules} {t.never}</Text>
                      </Center>
                  </Paper>
              )}
          </Stack>
      </Modal>
    </>
  );
};
