package store

type Event struct {
	ID             int64  `json:"id"`
	Slug           string `json:"slug"`
	CelebrantName  string `json:"celebrantName"`
	Title          string `json:"title"`
	IntroMessage   string `json:"introMessage"`
	EventDate      string `json:"eventDate"`
	DateIcon       string `json:"dateIcon"`
	RSVPDeadline   string `json:"rsvpDeadline"`
	Blessing       string `json:"blessing"`
	Parents        string `json:"parents"`
	Godparents     string `json:"godparents"`
	DressCode      string `json:"dressCode"`
	DressCodeStyle string `json:"dressCodeStyle"`
	DressCodeWomen string `json:"dressCodeWomen"`
	DressCodeMen   string `json:"dressCodeMen"`
	ReservedColors string `json:"reservedColors"`
	GiftMessage    string `json:"giftMessage"`
	Hashtag        string `json:"hashtag"`
	HashtagLabel   string `json:"hashtagLabel"`
	ShareTitle     string `json:"shareTitle"`
	ShareMessage   string `json:"shareMessage"`
	ShareUploadURL string `json:"shareUploadUrl"`
	Notes          string `json:"notes"`
	ClosingTitle   string `json:"closingTitle"`
	ClosingMessage string `json:"closingMessage"`
	ClosingSignoff string `json:"closingSignoff"`
	ThemePrimary   string `json:"themePrimary"`
	ThemeAccent    string `json:"themeAccent"`
}

type Venue struct {
	ID        int64  `json:"id"`
	EventID   int64  `json:"-"`
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Address   string `json:"address"`
	City      string `json:"city"`
	StartsAt  string `json:"startsAt"`
	MapsURL   string `json:"mapsUrl"`
	SortOrder int    `json:"sortOrder"`
}

type ItineraryItem struct {
	ID        int64  `json:"id"`
	EventID   int64  `json:"-"`
	TimeLabel string `json:"timeLabel"`
	Title     string `json:"title"`
	Icon      string `json:"icon"`
	SortOrder int    `json:"sortOrder"`
}

type PartyDetail struct {
	ID          int64  `json:"id"`
	EventID     int64  `json:"-"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sortOrder"`
}

type Guest struct {
	ID         int64   `json:"id"`
	EventID    int64   `json:"-"`
	Token      string  `json:"token"`
	Name       string  `json:"name"`
	Passes     int     `json:"passes"`
	Phone      string  `json:"phone"`
	Email      string  `json:"email"`
	GroupLabel string  `json:"groupLabel"`
	Notes      string  `json:"notes"`
	OpenedAt   *string `json:"openedAt"`
	// Veces que se ha abierto el link. Muy por encima de los pases asignados
	// significa que se reenvió.
	Views     int    `json:"views"`
	CreatedAt string `json:"createdAt"`
	RSVP      *RSVP  `json:"rsvp,omitempty"`
}

type RSVP struct {
	GuestID        int64  `json:"-"`
	Status         string `json:"status"`
	AttendingCount int    `json:"attendingCount"`
	Message        string `json:"message"`
	RespondedAt    string `json:"respondedAt"`
}

type Media struct {
	ID         int64  `json:"id"`
	EventID    int64  `json:"-"`
	Kind       string `json:"kind"`
	Section    string `json:"section"`
	StorageKey string `json:"-"`
	URL        string `json:"url"`
	Mime       string `json:"mime"`
	SizeBytes  int64  `json:"sizeBytes"`
	Caption    string `json:"caption"`
	SortOrder  int    `json:"sortOrder"`
	CreatedAt  string `json:"createdAt"`
}

type SongRequest struct {
	ID        int64  `json:"id"`
	GuestName string `json:"guestName"`
	Title     string `json:"title"`
	Artist    string `json:"artist"`
	CreatedAt string `json:"createdAt"`
}

// Summary alimenta el dashboard del CRM: totales, no personas individuales.
type Summary struct {
	Guests        int `json:"guests"`
	TotalPasses   int `json:"totalPasses"`
	Confirmed     int `json:"confirmed"`
	Declined      int `json:"declined"`
	Pending       int `json:"pending"`
	AttendingSeat int `json:"attendingSeats"`
	Opened        int `json:"opened"`
}
