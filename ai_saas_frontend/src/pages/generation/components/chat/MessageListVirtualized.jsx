import React, { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import MessageBubble from "./MessageBubble";
import QuotaAlert from "../../../../components/QuotaAlert";

function MessageListVirtualized({ messages, height }) {
  const [quota, setQuota] = useState({ monthly_usage: 0, monthly_quota: 0 });

  useEffect(() => {
    fetch("http://localhost:8000/api/quota/status", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setQuota(data))
      .catch(() => {});
  }, []);

  return (
    <>
      <QuotaAlert
        monthlyUsage={quota.monthly_usage}
        monthlyQuota={quota.monthly_quota}
      />

      <Virtuoso
        style={{ height, width: "100%" }}
        totalCount={messages.length}
        itemContent={(index) => (
          <div className="px-2 py-1">
            <MessageBubble msg={messages[index]} />
          </div>
        )}
        followOutput="auto"
        overscan={200}
      />
    </>
  );
}

export default MessageListVirtualized;
