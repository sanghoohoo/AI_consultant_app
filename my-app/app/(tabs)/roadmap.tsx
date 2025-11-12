
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { useColorScheme } from '../../components/useColorScheme';
import { getRoadmapByField, findMatchingFieldId, RoadmapDetails } from '../../api/roadmap';
import { useAuth } from '../../contexts/AuthContext';
import ComparisonSection from '../../components/ComparisonSection';
import { useFocusEffect } from '@react-navigation/native';

const RoadmapScreen = () => {
    const colorScheme = useColorScheme();
    const [roadmap, setRoadmap] = useState<RoadmapDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, profile } = useAuth(); // AuthContext에서 user와 profile을 가져옴

    const theme = {
        background: colorScheme === 'dark' ? '#121212' : '#F2F2F7',
        card: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
        text: colorScheme === 'dark' ? '#EAEAEA' : '#333333',
        secondaryText: colorScheme === 'dark' ? '#A9A9A9' : '#8A8A8E',
        accent: '#0A84FF',
        sectionHeader: colorScheme === 'dark' ? '#333333' : '#E5E5EA',
    };

    // 탭이 포커스될 때마다 데이터 새로고침
    useFocusEffect(
        useCallback(() => {
            const fetchRoadmap = async () => {
                if (!user) {
                    setError("로그인이 필요합니다.");
                    setIsLoading(false);
                    return;
                }

                // 프로필이 로드되었는지 확인
                if (!profile) {
                    setError("사용자 프로필을 불러오는 중입니다...");
                    return;
                }

                try {
                    setIsLoading(true);
                    setError(null);
                    const hopeMajor = profile.hope_major;

                    if (!hopeMajor) {
                        setError("희망 전공을 설정해주세요.");
                        setIsLoading(false);
                        return;
                    }

                    const fieldId = await findMatchingFieldId(hopeMajor);

                    if (!fieldId) {
                        setError("희망 전공과 일치하는 로드맵을 찾을 수 없습니다.");
                        setIsLoading(false);
                        return;
                    }

                    const data = await getRoadmapByField(fieldId);
                    if (data) {
                        setRoadmap(data);
                    } else {
                        setError("로드맵 정보를 불러오는데 실패했습니다.");
                    }
                } catch (e) {
                    setError("오류가 발생했습니다.");
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchRoadmap();
        }, [user, profile])
    );

    if (isLoading) {
        return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.accent} /></View>;
    }

    if (error) {
        return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>{error}</Text></View>;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>나의 로드맵</Text>

                {/* 상대비교 섹션 */}
                <ComparisonSection colorScheme={colorScheme} />

                {roadmap ? (
                    <>
                        {/* 계열 정보 카드 */}
                        <View style={[styles.card, { backgroundColor: theme.card }]}>
                            <Text style={[styles.fieldTitle, { color: theme.text }]}>{roadmap.name}</Text>
                            <Text style={[styles.adviceText, { color: theme.secondaryText }]}>
                                <Text style={{ color: theme.accent, fontWeight: 'bold' }}>선배의 조언: </Text>
                                {roadmap.advice}
                            </Text>
                        </View>

                        {/* 추천 과목 목록 */}
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>추천 과목</Text>
                        {roadmap.recommendedSubjects.map((section, index) => (
                            <View key={index} style={[styles.card, { backgroundColor: theme.card, marginBottom: 16 }]}>
                                <Text style={[styles.categoryTitle, { color: theme.accent }]}>{section.category}</Text>
                                <View style={styles.subjectContainer}>
                                    {section.subjects.map((subject, sIndex) => (
                                        <View key={sIndex} style={styles.subjectItem}>
                                            <Text style={[styles.subjectText, { color: theme.text }]}>{subject.name}</Text>
                                            <TouchableOpacity style={styles.addButton}>
                                                <Text style={styles.addButtonText}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </>
                ) : (
                    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center'}]}>
                        <Text style={{color: theme.text}}>로드맵 데이터가 없습니다.</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        padding: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    fieldTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
    },
    adviceText: {
        fontSize: 15,
        lineHeight: 22,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    subjectContainer: {
        marginTop: 8,
    },
    subjectItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    subjectText: {
        fontSize: 16,
    },
    addButton: {
        backgroundColor: '#0A84FF',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 20,
    },
});

export default RoadmapScreen;
