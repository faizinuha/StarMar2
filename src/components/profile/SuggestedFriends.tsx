import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFollow } from '../../hooks/useFollow';
import SuggestedFriendsSkeleton from '../skeletons/SuggestedFriendsSkeleton';
import { supabase } from '../../integrations/supabase/client';
import { useEffect, useState } from 'react';
import { definitions } from '../../integrations/supabase/types';

type Profile = definitions['profiles'];

const SuggestedFriends = () => {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const { following, toggleFollow } = useFollow(user?.id);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch profiles the user is already following
            const { data: followingProfiles, error: followingError } = await supabase
                .from('follows')
                .select('followed_id')
                .eq('follower_id', user.id);

            if (followingError) {
                console.error('Error fetching following list:', followingError);
                setLoading(false);
                return;
            }

            const followingIds = followingProfiles.map(f => f.followed_id);
            const excludedIds = [...followingIds, user.id];

            // Fetch random profiles, excluding the user and those they follow
            // For true randomness at scale, a database function is better.
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .not('id', 'in', `(${excludedIds.join(',')})`)
                .limit(5);

            if (profilesError) {
                console.error('Error fetching suggestions:', profilesError);
            } else if (profiles) {
                // Simple client-side shuffle for better randomness
                setSuggestions(profiles.sort(() => 0.5 - Math.random()));
            }
            setLoading(false);
        };

        fetchSuggestions();
    }, [user]);

    if (loading) {
        return <SuggestedFriendsSkeleton />;
    }

    if (!suggestions.length) {
        return null; // Don't show the component if there are no suggestions
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mt-6">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Suggested for you</h3>
            <div className="space-y-4">
                {suggestions.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between">
                        <Link to={`/profile/${profile.username}`} className="flex items-center space-x-3">
                            <img src={profile.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${profile.username}`} alt={profile.username} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{profile.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">New to WigsStar</p>
                            </div>
                        </Link>
                        <button
                            onClick={() => toggleFollow(profile.id)}
                            className={`text-sm font-semibold py-1 px-3 rounded-lg ${
                                following.includes(profile.id)
                                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                                    : 'bg-blue-500 text-white'
                            }`}
                        >
                            {following.includes(profile.id) ? 'Following' : 'Follow'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SuggestedFriends;
