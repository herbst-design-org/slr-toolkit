import { toast } from "react-toastify";

interface MsgProps {
  message: string;
  title?: string;
}

const Msg = ({ data }: { data: MsgProps }) => {
  return (
    <div className="">
      {data.title && <p className="msg-title">{data.title}</p>}
      <p className="msg-description">{data.message}</p>
    </div>
  );
};

export const notify = ({ message, title }: MsgProps) => {
  toast(Msg, {
    data: {
      title,
      message,
    },
    className:
      " w-[400px] border border-zinc-200 dark:border-zinc-600 dark:bg-zinc-900",
  });
};

export const notifyTrpcStatus = ({
  successMessage,
  status,
  error,
}: {
  successMessage: string;
  status: string;
  error?: string;
}) => {
  if (status === "success") {
    notify({ message: successMessage });
  } else if (status === "error") {
    notify({ message: error ?? "Something went wrong" });
  } else {
    notify({ message: status });
  }
};
