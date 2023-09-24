import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs";

import Comment from "@/components/forms/Comment";
import NerdTalkCard from "@/components/cards/NerdTalkCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchNerdTalkById } from "@/lib/actions/nerdtalk.actions";

export const revalidate = 0;

async function page({ params }: { params: { id: string } }) {
  if (!params.id) return null;

  const user = await currentUser();
  if (!user) return null;

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const nerdTalk = await fetchNerdTalkById(params.id);

  return (
    <section className='relative'>
      <div>
        <NerdTalkCard
          id={nerdTalk._id}
          currentUserId={user.id}
          parentId={nerdTalk.parentId}
          content={nerdTalk.text}
          author={nerdTalk.author}
          community={nerdTalk.community}
          createdAt={nerdTalk.createdAt}
          comments={nerdTalk.children}
        />
      </div>

      <div className='mt-7'>
        <Comment
          nerdTalkId={params.id}
          currentUserImg={user.imageUrl}
          currentUserId={JSON.stringify(userInfo._id)}
        />
      </div>

      <div className='mt-10'>
        {nerdTalk.children.map((childItem: any) => (
          <NerdTalkCard
            key={childItem._id}
            id={childItem._id}
            currentUserId={user.id}
            parentId={childItem.parentId}
            content={childItem.text}
            author={childItem.author}
            community={childItem.community}
            createdAt={childItem.createdAt}
            comments={childItem.children}
            isComment
          />
        ))}
      </div>
    </section>
  );
}

export default page;
