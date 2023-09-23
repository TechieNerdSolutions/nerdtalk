import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import PostTalk from "@/components/forms/PostTalk";
import { fetchUser } from "@/lib/actions/user.actions";

async function Page() {
  const user = await currentUser();
  if (!user) return null;

  // fetch organization list created by user
  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  return (
    <>
      <h1 className='head-text'>Create NerdTalk</h1>

      <PostTalk userId={userInfo._id} />
    </>
  );
}

export default Page;
