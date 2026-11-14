BEGIN;

-- Remove all old conversation entries of the retired presentation types.
DELETE FROM public.couple_messages
WHERE message_type IN ('sticker', 'gift');

-- Prevent either retired type from being inserted again.
ALTER TABLE public.couple_messages
  DROP CONSTRAINT IF EXISTS couple_messages_type_chk;

ALTER TABLE public.couple_messages
  ADD CONSTRAINT couple_messages_type_chk
  CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file'));

COMMENT ON COLUMN public.couple_messages.message_type IS
  'Supported private conversation message types: text, image, video, audio and file.';

COMMIT;
