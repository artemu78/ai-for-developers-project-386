import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Call Calendar API" })
@server("http://localhost:3000", "Local development server")
namespace CallCalendar;

alias Id = string;

@doc("The single preconfigured calendar owner. The API has no registration or authentication.")
model Owner {
  id: Id;
  name: string;
  timezone: string;
}

@doc("A type of meeting offered by the calendar owner.")
model EventType {
  id: Id;
  title: string;
  description: string;
  @minValue(1)
  durationMinutes: int32;
}

@doc("Input used by the owner to create a meeting type. The client supplies its stable id.")
model CreateEventTypeRequest {
  id: Id;
  title: string;
  description: string;
  @minValue(1)
  durationMinutes: int32;
}

@doc("A bookable interval calculated for an event type in the owner's timezone.")
model Slot {
  eventTypeId: Id;
  startsAt: utcDateTime;
  endsAt: utcDateTime;
}

@doc("Guest details and the selected slot. No guest account is created.")
model CreateBookingRequest {
  eventTypeId: Id;
  startsAt: utcDateTime;
  guestName: string;
  guestEmail: string;
}

@doc("A confirmed meeting. Its end time is derived from the selected event type duration.")
model Booking {
  id: Id;
  eventTypeId: Id;
  eventTypeTitle: string;
  startsAt: utcDateTime;
  endsAt: utcDateTime;
  guestName: string;
  guestEmail: string;
  createdAt: utcDateTime;
}

model ErrorBody {
  code: string;
  message: string;
}

model BadRequest {
  @statusCode statusCode: 400;
  @body body: ErrorBody;
}

model NotFound {
  @statusCode statusCode: 404;
  @body body: ErrorBody;
}

model Conflict {
  @statusCode statusCode: 409;
  @body body: ErrorBody;
}

@route("/owner")
namespace OwnerApi {
  @get
  @summary("Get the preconfigured owner profile")
  op getOwner(): Owner;

  @route("/event-types")
  @get
  @summary("List all meeting types for the owner")
  op listEventTypes(): EventType[];

  @route("/event-types")
  @post
  @summary("Create a meeting type")
  op createEventType(@body input: CreateEventTypeRequest): {
    @statusCode statusCode: 201;
    @body body: EventType;
  } | Conflict;

  @route("/bookings")
  @get
  @summary("List upcoming bookings across every meeting type")
  op listUpcomingBookings(): Booking[];
}

@route("/public")
namespace PublicApi {
  @route("/event-types")
  @get
  @summary("List meeting types available to guests")
  op listEventTypes(): EventType[];

  @route("/event-types/{eventTypeId}")
  @get
  @summary("Get one public meeting type")
  op getEventType(@path eventTypeId: Id): EventType | NotFound;

  @route("/slots")
  @get
  @summary("List free slots for a meeting type")
  @doc("Returns only currently free slots within the booking window: today and the following 13 calendar days (14 days total). The server rejects ranges outside that window. Slots that overlap any existing booking are excluded, regardless of meeting type.")
  op listAvailableSlots(
    @query eventTypeId: Id,
    @query from?: plainDate,
    @query to?: plainDate,
  ): Slot[] | BadRequest | NotFound;

  @route("/bookings")
  @post
  @summary("Book a free slot as a guest")
  @doc("Creates a booking only when startsAt identifies a free slot returned for the requested event type and lies within the 14-day booking window. A booking conflicts with every overlapping booking, including bookings of other meeting types.")
  op createBooking(@body input: CreateBookingRequest): {
    @statusCode statusCode: 201;
    @body body: Booking;
  } | BadRequest | NotFound | Conflict;
}
