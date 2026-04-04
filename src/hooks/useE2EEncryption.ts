import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { generateKeyPair, storePrivateKey, getPrivateKey } from '@/lib/crypto';

export function useE2EEncryption() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [myPrivateKey, setMyPrivateKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    initKeys();
  }, [user]);

  async function initKeys() {
    if (!user) return;

    try {
      // Check if we have a private key stored locally
      let privateKey = await getPrivateKey(user.id);

      if (privateKey) {
        setMyPrivateKey(privateKey);
        setIsReady(true);
        return;
      }

      // Check if server has our public key
      const { data: existingKey } = await supabase
        .from('user_keys')
        .select('public_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingKey) {
        // Server has public key but we lost private key - regenerate
        console.warn('E2EE: Private key lost, regenerating keypair');
      }

      // Generate new keypair
      const { publicKey, privateKey: newPrivateKey } = await generateKeyPair();

      // Store private key locally
      await storePrivateKey(user.id, newPrivateKey);
      setMyPrivateKey(newPrivateKey);

      // Upload public key to server
      await supabase
        .from('user_keys')
        .upsert({
          user_id: user.id,
          public_key: publicKey,
          key_type: 'ECDH-P256',
        }, { onConflict: 'user_id' });

      setIsReady(true);
    } catch (error) {
      console.error('E2EE init failed:', error);
      setIsReady(true); // Still allow messaging without encryption
    }
  }

  async function getPublicKeyForUser(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.public_key || null;
  }

  return {
    isReady,
    myPrivateKey,
    getPublicKeyForUser,
  };
}
