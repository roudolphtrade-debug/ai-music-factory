import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:surface-premium group-[.toaster]:border group-[.toaster]:border-[color-mix(in_oklab,var(--gold)_22%,transparent)] group-[.toaster]:text-foreground group-[.toaster]:rounded-xl group-[.toaster]:backdrop-blur-sm",
          title: "group-[.toast]:font-medium group-[.toast]:tracking-tight",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-gold-gradient group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-muted-foreground",
          icon: "group-[.toast]:text-gold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
