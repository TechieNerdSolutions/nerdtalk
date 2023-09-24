import * as z from "zod";

export const NerdTalkValidation = z.object({
  nerdtalk: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
  accountId: z.string(),
});

export const CommentValidation = z.object({
  nerdtalk: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
});
