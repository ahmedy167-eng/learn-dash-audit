import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useStaffChat, StaffMember } from '@/hooks/useStaffChat';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, Send, MessageCircle, ArrowLeft, Users } from 'lucide-react';

function getInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function formatFullTime(dateStr: string) {
  return format(new Date(dateStr), 'h:mm a');
}

export default function StaffChat() {
  const { user } = useAuth();
  const {
    staffMembers,
    conversations,
    messages,
    selectedContact,
    loading,
    messagesLoading,
    selectContact,
    sendMessage,
    setSelectedContact,
  } = useStaffChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return;
    setSending(true);
    const success = await sendMessage(messageInput);
    if (success) setMessageInput('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectContact = (contact: StaffMember) => {
    selectContact(contact);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    setMobileShowChat(false);
    setSelectedContact(null);
  };

  // Build the display list: contacts with conversations first, then remaining staff
  const conversationContactIds = new Set(conversations.map(c => c.contact.user_id));
  const otherStaff = staffMembers.filter(s => !conversationContactIds.has(s.user_id));

  const filteredConversations = conversations.filter(c =>
    c.contact.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOtherStaff = otherStaff.filter(s =>
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages by date
  const groupedMessages: { date: string; msgs: typeof messages }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({ date, msgs: [] });
    }
    groupedMessages[groupedMessages.length - 1].msgs.push(msg);
  }

  function formatDateLabel(dateStr: string) {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex animate-in">
        {/* Staff List Panel */}
        <div
          className={cn(
            'w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card',
            mobileShowChat && 'hidden md:flex'
          )}
        >
          {/* Search Header */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Staff Chat</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Contact List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-3 w-40 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2">
                {/* Conversations */}
                {filteredConversations.map((conv, i) => (
                  <button
                    key={conv.contact.user_id}
                    onClick={() => handleSelectContact(conv.contact)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left hover-lift',
                      `animate-in stagger-${Math.min(i + 1, 5)}`,
                      selectedContact?.user_id === conv.contact.user_id
                        ? 'bg-accent'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(conv.contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground truncate">
                          {conv.contact.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatMessageTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate pr-2">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center text-xs px-1.5 flex-shrink-0">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Other Staff (no conversations yet) */}
                {filteredOtherStaff.length > 0 && (
                  <>
                    {filteredConversations.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 mt-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Other Staff
                        </span>
                      </div>
                    )}
                    {filteredOtherStaff.map((member, i) => (
                      <button
                        key={member.user_id}
                        onClick={() => handleSelectContact(member)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left hover-lift',
                          `animate-in stagger-${Math.min(i + 1, 5)}`,
                          selectedContact?.user_id === member.user_id
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                        )}
                      >
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-foreground truncate block">
                            {member.full_name || 'Unknown'}
                          </span>
                          <Badge variant="secondary" className="text-xs mt-0.5">
                            {member.role === 'admin' ? 'Admin' : 'Teacher'}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {filteredConversations.length === 0 && filteredOtherStaff.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No staff members found
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Thread Panel */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-background',
            !mobileShowChat && 'hidden md:flex'
          )}
        >
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(selectedContact.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {selectedContact.full_name || 'Unknown'}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {selectedContact.role === 'admin' ? 'Admin' : 'Teacher'}
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground text-sm">Loading messages...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedMessages.map(group => (
                      <div key={group.date}>
                        <div className="flex items-center justify-center mb-4">
                          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {formatDateLabel(group.date)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.msgs.map((msg) => {
                            const isMine = msg.sender_user_id === user?.id;
                            return (
                              <div
                                key={msg.id}
                                className={cn(
                                  'flex animate-in',
                                  isMine ? 'justify-end' : 'justify-start'
                                )}
                              >
                                <div
                                  className={cn(
                                    'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                                    isMine
                                      ? 'bg-primary text-primary-foreground rounded-br-md'
                                      : 'bg-muted text-foreground rounded-bl-md'
                                  )}
                                >
                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                  <p
                                    className={cn(
                                      'text-[10px] mt-1',
                                      isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                    )}
                                  >
                                    {formatFullTime(msg.created_at)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!messageInput.trim() || sending}
                    className="h-10 w-10 flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Staff Chat</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Select a staff member to start chatting. Messages are delivered in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
