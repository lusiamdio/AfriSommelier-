import { motion } from 'motion/react';
import { Users, ShoppingBag, Gift, Star } from 'lucide-react';

export default function SocialTab() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h2 className="text-4xl md:text-5xl font-serif font-light mb-4">Wine <span className="italic text-accent">Community</span></h2>
        <p className="text-ink-light max-w-2xl text-sm md:text-base leading-relaxed">
          Connect with friends, follow top sommeliers, and discover what the community is drinking.
        </p>
      </motion.div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <ActionCard 
          icon={<Users className="text-olive" />}
          title="Party Mode"
          description="Scan multiple wines to rank the best for your group's taste profile."
        />
        <ActionCard 
          icon={<ShoppingBag className="text-accent" />}
          title="Marketplace"
          description="Buy directly from local vineyards and specialized merchants."
        />
        <ActionCard 
          icon={<Gift className="text-ink-light" />}
          title="AI Gift Engine"
          description="Find the perfect bottle for a boss, partner, or client."
        />
      </div>

      {/* Social Feed */}
      <div>
        <h3 className="text-2xl font-serif font-medium mb-6">Trending in Cape Town</h3>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm text-center">
            <p className="text-ink-light text-sm">No recent activity from your network. Connect with more friends to see what they are drinking.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, description }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm cursor-pointer group"
    >
      <div className="mb-4 bg-bg w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="font-serif text-xl font-medium mb-2">{title}</h4>
      <p className="text-sm text-ink-light leading-relaxed">{description}</p>
    </motion.div>
  );
}

function FeedItem({ user, role, action, wine, rating, comment, time, avatar }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex gap-4">
      <img src={avatar} alt={user} className="w-12 h-12 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <div>
            <span className="font-medium">{user}</span>
            <span className="text-ink-light text-xs ml-2 px-2 py-0.5 bg-bg rounded-full">{role}</span>
          </div>
          <span className="text-xs text-ink-light">{time}</span>
        </div>
        <p className="text-sm text-ink-light mb-2">
          {action} <span className="font-medium text-ink">{wine}</span>
        </p>
        {rating && (
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} className={i < rating ? "fill-accent text-accent" : "text-black/10"} />
            ))}
          </div>
        )}
        <p className="text-sm leading-relaxed">{comment}</p>
      </div>
    </div>
  );
}
