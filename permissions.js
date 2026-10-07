const Permissions = {
  roles: Object.freeze({ owner:{label:"Owner",level:4}, admin:{label:"Admin",level:3}, community_manager:{label:"Community Manager",level:3}, moderator:{label:"Moderator",level:2}, member:{label:"Member",level:1}, ai:{label:"AI",level:0} }),
  roleOrder: Object.freeze(["owner", "community_manager", "admin", "moderator", "member", "ai"]),
  normalize(role){
    const key=String(role||"").trim().toLowerCase().replace(/[\s-]+/g,"_");
    return this.roles[key] ? key : "member";
  },
  profileRoles(profile){
    const values = Array.isArray(profile?.roles) && profile.roles.length
      ? profile.roles
      : [profile?.role];
    const normalized = [...new Set(values.map(role => this.normalize(role)))];
    const ordered = this.roleOrder.filter(role => normalized.includes(role));
    return ordered.length ? ordered : ["member"];
  },
  hasExactRole(profile, role){ return this.profileRoles(profile).includes(this.normalize(role)); },
  primaryRole(profile){
    return this.profileRoles(profile).sort((a,b) => this.level(b) - this.level(a))[0] || "member";
  },
  label(role){ return this.roles[this.normalize(role)].label; },
  level(role){ return this.roles[this.normalize(role)].level; },
  hasRole(profile, role){ return this.profileRoles(profile).some(item => this.level(item) >= this.level(role)); },
  canBypassMessageLimit(profile){ return this.hasExactRole(profile,"owner") || this.hasExactRole(profile,"community_manager"); },
  canUseEveryone(profile){ return this.hasExactRole(profile,"owner") || this.hasExactRole(profile,"admin") || this.hasExactRole(profile,"community_manager"); },
  canManageForumPins(profile){ return this.hasExactRole(profile,"owner") || this.hasExactRole(profile,"admin") || this.hasExactRole(profile,"community_manager"); },
  isStaff(profile){ return this.hasRole(profile,"moderator"); },
  canModerate(profile){ return this.isStaff(profile); },
  canViewStaff(profile){ return this.isStaff(profile); },
  canPostChannel(profile, channel){
    if (!channel || channel.is_log) return false;
    if (String(channel.type || "text").toLowerCase() === "announcement") return this.hasExactRole(profile,"owner") || this.hasExactRole(profile,"community_manager");
    if (String(channel.visibility || "public").toLowerCase() === "staff") return this.isStaff(profile);
    return true;
  },
  canEditMessage(actorId, message){ return !!actorId && actorId === (message?.user_id || message?.sender_id); },
  canDeleteMessage(actorProfile, targetProfile, actorId, message){
    if (!this.canEditMessage(actorId, message)) {
      if (!this.canModerate(actorProfile)) return false;
      if (this.hasExactRole(targetProfile,"owner") && !this.hasExactRole(actorProfile,"owner")) return false;
    }
    return true;
  }
};
