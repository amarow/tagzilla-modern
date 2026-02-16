import { useState, useEffect } from 'react';
import { Modal, Stack, Group, TextInput, Loader, Button, Card, ScrollArea, Text } from '@mantine/core';
import { IconFolder, IconArrowUp, IconCheck } from '@tabler/icons-react';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { API_BASE, authFetch } from '../store/utils';

interface DirectoryPickerModalProps {
    opened: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
    title?: string;
    initialPath?: string;
}

export const DirectoryPickerModal = ({ opened, onClose, onSelect, title, initialPath }: DirectoryPickerModalProps) => {
    const { token, language } = useAppStore();
    const t = translations[language];

    const [browserPath, setBrowserPath] = useState('');
    const [browserEntries, setBrowserEntries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (opened) {
            fetchDirectory(initialPath || '');
        }
    }, [opened]);

    const fetchDirectory = async (path: string = '') => {
        setIsLoading(true);
        try {
            if (!token) return;
            const url = new URL(`${API_BASE}/api/fs/list`);
            if (path) url.searchParams.append('path', path);
            const res = await authFetch(url.toString(), token);
            if (res.ok) {
                const data = await res.json();
                setBrowserPath(data.currentPath);
                setBrowserEntries(data.entries);
            }
        } catch (e) {
            console.error("Failed to fetch directory", e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={title || t.selectDirectory}
            size="lg"
            zIndex={2000}
        >
            <Stack>
                <Group>
                    <TextInput 
                        value={browserPath} 
                        onChange={(e) => setBrowserPath(e.currentTarget.value)}
                        style={{ flex: 1 }}
                        rightSection={isLoading ? <Loader size="xs" /> : null}
                        onKeyDown={(e) => e.key === 'Enter' && fetchDirectory(browserPath)}
                    />
                    <Button onClick={() => fetchDirectory(browserPath)} variant="default">{t.go}</Button>
                </Group>
                
                <Card withBorder p={0}>
                    <ScrollArea h={300}>
                        {browserEntries.map((entry) => (
                            <Group 
                                key={entry.path} 
                                p="xs" 
                                style={{ 
                                    cursor: 'pointer', 
                                    borderBottom: '1px solid var(--mantine-color-default-border)' 
                                }}
                                onClick={() => fetchDirectory(entry.path)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--mantine-color-default-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {entry.name === '..' ? <IconArrowUp size={16} /> : <IconFolder size={16} />}
                                <Text size="sm">{entry.name}</Text>
                            </Group>
                        ))}
                        {browserEntries.length === 0 && !isLoading && (
                            <Text c="dimmed" p="md" ta="center">{t.directoryEmpty}</Text>
                        )}
                    </ScrollArea>
                </Card>

                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>{t.cancel}</Button>
                    <Button onClick={() => onSelect(browserPath)} leftSection={<IconCheck size={16} />}>
                        {t.select}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};
