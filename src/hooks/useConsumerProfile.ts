import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ConsumerProfile {
  id: string;
  userId: string;
  hairTexture: string;
  topConcerns: string[];
  hairGoals: string[];
  scalpCondition: string;
  chemicalProcessing: boolean;
  protectiveStyles: boolean;
  washFrequency: string;
  createdAt: string;
  updatedAt: string;
}

export const useConsumerProfile = (userId?: string) => {
  const [profile, setProfile] = useState<ConsumerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: dbError } = await supabase
          .from('consumer_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (dbError) {
          throw dbError;
        } else if (data) {
          setProfile({
            id: data.id,
            userId: data.user_id,
            hairTexture: data.hair_texture || '',
            topConcerns: data.top_concerns || [],
            hairGoals: data.hair_goals || [],
            scalpCondition: data.scalp_condition || '',
            chemicalProcessing: data.chemical_processing ?? false,
            protectiveStyles: data.protective_styles ?? false,
            washFrequency: data.wash_frequency || '',
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        } else {
          setProfile(null);
        }
      } catch (err: any) {
        console.error('Failed to load consumer profile:', err);
        setError('Could not load your profile.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  return { profile, loading, error };
};